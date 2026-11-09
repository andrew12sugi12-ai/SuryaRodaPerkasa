import { prisma } from "@/lib/prisma";
import { JournalSourceType, PaymentType, PaymentMethod, GiroStatus, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { PaymentInput } from "@/lib/validation/payment";

const AR_ACCOUNT_CODE = "1100";
const AP_ACCOUNT_CODE = "2000";
const FX_ACCOUNT_CODE = "6895"; // Laba/Rugi Selisih Kurs
const GIRO_IN_TRANSIT_CODE = "1150";
const DISCOUNT_ACCOUNT_CODE = "4900"; // Retur & Potongan Penjualan

function isGiro(method: PaymentMethod) {
  return method === PaymentMethod.GIRO || method === PaymentMethod.CEK;
}

export async function recordPayment(input: PaymentInput & { createdById: string }) {
  return prisma.$transaction(async (tx) => {
    const isReceipt = input.type === "CUSTOMER_RECEIPT";
    const controlCode = isReceipt ? AR_ACCOUNT_CODE : AP_ACCOUNT_CODE;
    const controlAccount = await tx.account.findUnique({ where: { code: controlCode } });
    if (!controlAccount) throw new Error(`Account ${controlCode} is not configured`);

    const method = input.method ?? PaymentMethod.TRANSFER;
    // A giro/cek received from a customer is not cash yet: it parks in the
    // Giro-in-Transit account until it clears. The customer's AR still drops.
    const giroReceipt = isReceipt && isGiro(method);

    const settleAmount = input.amount;
    // Early-payment discount — only on a plain (non-giro) customer receipt.
    const discount =
      isReceipt && !giroReceipt && (input.discount ?? 0) > 0
        ? Math.min(input.discount as number, settleAmount)
        : 0;

    const cashAmount = input.cashAmount ?? input.amount;
    const fxDiff = Math.round((settleAmount - cashAmount) * 100) / 100;
    // FX only applies to real cash movement, and never alongside a discount.
    const hasFx = fxDiff !== 0 && !giroReceipt && discount === 0;

    let fxAccount: { id: string } | null = null;
    if (hasFx) {
      fxAccount = await tx.account.findUnique({ where: { code: FX_ACCOUNT_CODE } });
      if (!fxAccount) throw new Error(`Selisih Kurs account (${FX_ACCOUNT_CODE}) is not configured`);
    }

    let discountAccount: { id: string } | null = null;
    if (discount > 0) {
      discountAccount = await tx.account.findUnique({ where: { code: DISCOUNT_ACCOUNT_CODE } });
      if (!discountAccount) {
        throw new Error(`Potongan Penjualan account (${DISCOUNT_ACCOUNT_CODE}) is not configured`);
      }
    }

    // For a giro receipt the money lands in Giro-in-Transit, not the bank yet.
    let debitAccountId = input.accountId;
    if (giroReceipt) {
      const transit = await tx.account.findUnique({ where: { code: GIRO_IN_TRANSIT_CODE } });
      if (!transit) throw new Error(`Giro in Transit (${GIRO_IN_TRANSIT_CODE}) account is not configured`);
      debitAccountId = transit.id;
    }

    const entityName = isReceipt
      ? (await tx.customer.findUnique({ where: { id: input.customerId! } }))?.name
      : (await tx.supplier.findUnique({ where: { id: input.supplierId! } }))?.name;

    // Cash actually hitting the bank on a receipt: settle amount less any discount.
    const receiptBankDebit = giroReceipt ? settleAmount : discount > 0 ? settleAmount - discount : cashAmount;

    const lines: { accountId: string; debit: number; credit: number; description?: string }[] =
      isReceipt
        ? [
            { accountId: debitAccountId, debit: receiptBankDebit, credit: 0 },
            { accountId: controlAccount.id, debit: 0, credit: settleAmount },
          ]
        : [
            { accountId: controlAccount.id, debit: settleAmount, credit: 0 },
            { accountId: input.accountId, debit: 0, credit: cashAmount },
          ];

    if (discount > 0 && discountAccount) {
      lines.push({ accountId: discountAccount.id, debit: discount, credit: 0, description: "Potongan pelunasan" });
    }

    if (hasFx && fxAccount) {
      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      const imbalance = Math.round((totalDebit - totalCredit) * 100) / 100;
      if (imbalance > 0) {
        lines.push({ accountId: fxAccount.id, debit: 0, credit: imbalance, description: "Selisih kurs" });
      } else {
        lines.push({ accountId: fxAccount.id, debit: -imbalance, credit: 0, description: "Selisih kurs" });
      }
    }

    const methodLabel = method.toLowerCase();
    const journalEntry = await createJournalEntry(
      {
        date: input.date,
        memo:
          input.memo ||
          (isReceipt
            ? `Pembayaran (${methodLabel}) dari ${entityName ?? "pelanggan"}`
            : `Pembayaran (${methodLabel}) ke ${entityName ?? "pemasok"}`),
        reference: input.reference ?? input.instrumentNumber,
        sourceType: JournalSourceType.PAYMENT,
        createdById: input.createdById,
        lines,
      },
      tx
    );

    return tx.payment.create({
      data: {
        date: input.date,
        type: isReceipt ? PaymentType.CUSTOMER_RECEIPT : PaymentType.SUPPLIER_PAYMENT,
        method,
        customerId: isReceipt ? input.customerId : null,
        supplierId: isReceipt ? null : input.supplierId,
        accountId: input.accountId,
        amount: new Prisma.Decimal(settleAmount),
        cashAmount: hasFx ? new Prisma.Decimal(cashAmount) : null,
        discount: discount > 0 ? new Prisma.Decimal(discount) : null,
        instrumentNumber: input.instrumentNumber,
        instrumentBank: input.instrumentBank,
        dueDate: input.dueDate ?? null,
        giroStatus: giroReceipt ? GiroStatus.PENDING : null,
        reference: input.reference,
        memo: input.memo,
        journalEntryId: journalEntry.id,
        createdById: input.createdById,
      },
      include: { customer: true, supplier: true, account: true },
    });
  });
}

// Clear a pending giro/cek receipt: Dr Bank (the payment's account) / Cr Giro in Transit.
export async function clearGiroPayment(paymentId: string, createdById: string, clearDate?: Date) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.giroStatus !== GiroStatus.PENDING) {
      throw new Error("Only a pending giro/cek can be cleared");
    }
    const transit = await tx.account.findUniqueOrThrow({ where: { code: GIRO_IN_TRANSIT_CODE } });
    const je = await createJournalEntry(
      {
        date: clearDate ?? new Date(),
        memo: `Giro cair — ${payment.instrumentNumber ?? payment.id}`,
        reference: payment.instrumentNumber,
        sourceType: JournalSourceType.PAYMENT,
        createdById,
        lines: [
          { accountId: payment.accountId, debit: Number(payment.amount), credit: 0 },
          { accountId: transit.id, debit: 0, credit: Number(payment.amount) },
        ],
      },
      tx
    );
    return tx.payment.update({
      where: { id: paymentId },
      data: { giroStatus: GiroStatus.CLEARED, clearJournalEntryId: je.id },
    });
  });
}

// Bounce a pending giro/cek receipt: reverse the receipt, Dr AR / Cr Giro in
// Transit, so the customer's receivable reopens.
export async function bounceGiroPayment(
  paymentId: string,
  reason: string,
  createdById: string,
  bounceDate?: Date
) {
  if (!reason?.trim()) throw new Error("A bounce reason (SKP) is required");
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.giroStatus !== GiroStatus.PENDING) {
      throw new Error("Only a pending giro/cek can bounce");
    }
    const [arAccount, transit] = await Promise.all([
      tx.account.findUniqueOrThrow({ where: { code: AR_ACCOUNT_CODE } }),
      tx.account.findUniqueOrThrow({ where: { code: GIRO_IN_TRANSIT_CODE } }),
    ]);
    const je = await createJournalEntry(
      {
        date: bounceDate ?? new Date(),
        memo: `Giro tolak — ${payment.instrumentNumber ?? payment.id} (${reason})`,
        reference: payment.instrumentNumber,
        sourceType: JournalSourceType.PAYMENT,
        createdById,
        lines: [
          { accountId: arAccount.id, debit: Number(payment.amount), credit: 0 },
          { accountId: transit.id, debit: 0, credit: Number(payment.amount) },
        ],
      },
      tx
    );
    return tx.payment.update({
      where: { id: paymentId },
      data: { giroStatus: GiroStatus.BOUNCED, bounceReason: reason, clearJournalEntryId: je.id },
    });
  });
}

export async function listPayments() {
  return prisma.payment.findMany({
    orderBy: { date: "desc" },
    include: { customer: true, supplier: true, account: true },
  });
}

// Pending giros due to clear within `days`, for an alert panel.
export async function getPendingGiros() {
  return prisma.payment.findMany({
    where: { giroStatus: GiroStatus.PENDING },
    orderBy: { dueDate: "asc" },
    include: { customer: true, account: true },
  });
}
