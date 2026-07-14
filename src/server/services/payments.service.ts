import { prisma } from "@/lib/prisma";
import { JournalSourceType, PaymentType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { PaymentInput } from "@/lib/validation/payment";

const AR_ACCOUNT_CODE = "1100";
const AP_ACCOUNT_CODE = "2000";

export async function recordPayment(input: PaymentInput & { createdById: string }) {
  return prisma.$transaction(async (tx) => {
    const isReceipt = input.type === "CUSTOMER_RECEIPT";
    const controlCode = isReceipt ? AR_ACCOUNT_CODE : AP_ACCOUNT_CODE;
    const controlAccount = await tx.account.findUnique({ where: { code: controlCode } });
    if (!controlAccount) {
      throw new Error(`Account ${controlCode} is not configured`);
    }

    const entityName = isReceipt
      ? (await tx.customer.findUnique({ where: { id: input.customerId! } }))?.name
      : (await tx.supplier.findUnique({ where: { id: input.supplierId! } }))?.name;

    const journalEntry = await createJournalEntry(
      {
        date: input.date,
        memo:
          input.memo ||
          (isReceipt ? `Pembayaran dari ${entityName ?? "pelanggan"}` : `Pembayaran ke ${entityName ?? "pemasok"}`),
        reference: input.reference,
        sourceType: JournalSourceType.PAYMENT,
        createdById: input.createdById,
        lines: isReceipt
          ? [
              { accountId: input.accountId, debit: input.amount, credit: 0 },
              { accountId: controlAccount.id, debit: 0, credit: input.amount },
            ]
          : [
              { accountId: controlAccount.id, debit: input.amount, credit: 0 },
              { accountId: input.accountId, debit: 0, credit: input.amount },
            ],
      },
      tx
    );

    return tx.payment.create({
      data: {
        date: input.date,
        type: isReceipt ? PaymentType.CUSTOMER_RECEIPT : PaymentType.SUPPLIER_PAYMENT,
        customerId: isReceipt ? input.customerId : null,
        supplierId: isReceipt ? null : input.supplierId,
        accountId: input.accountId,
        amount: new Prisma.Decimal(input.amount),
        reference: input.reference,
        memo: input.memo,
        journalEntryId: journalEntry.id,
        createdById: input.createdById,
      },
      include: { customer: true, supplier: true, account: true },
    });
  });
}

export async function listPayments() {
  return prisma.payment.findMany({
    orderBy: { date: "desc" },
    include: { customer: true, supplier: true, account: true },
  });
}
