import { prisma } from "@/lib/prisma";
import { Prisma, JournalSourceType } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import { InsufficientStockError } from "@/server/errors";

const INVENTORY_ACCOUNT_CODE = "1200";
const SALES_REVENUE_ACCOUNT_CODE = "4000";
const COGS_ACCOUNT_CODE = "5000";

export type RecordSaleInput = {
  date: Date;
  dueDate?: Date | null;
  customerId: string;
  salesmanId?: string | null;
  paymentAccountId: string;
  reference?: string | null;
  createdById: string;
  lines: { productId: string; quantity: number; unitPrice: number }[];
};

type Tx = Prisma.TransactionClient;

// Restores stock for a sale's lines and removes the sale + its two journal
// entries — the reversible half of an edit, usable inside a shared transaction.
export async function reverseSaleTx(tx: Tx, saleId: string) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { lines: true },
  });
  for (const line of sale.lines) {
    await tx.product.update({
      where: { id: line.productId },
      data: { quantityOnHand: { increment: line.quantity } },
    });
  }
  await tx.sale.delete({ where: { id: saleId } });
  await tx.journalEntry.delete({ where: { id: sale.revenueJournalEntryId } });
  await tx.journalEntry.delete({ where: { id: sale.cogsJournalEntryId } });
}

export async function recordSaleTx(tx: Tx, input: RecordSaleInput) {
  const [inventoryAccount, revenueAccount, cogsAccount] = await Promise.all([
    tx.account.findUnique({ where: { code: INVENTORY_ACCOUNT_CODE } }),
    tx.account.findUnique({ where: { code: SALES_REVENUE_ACCOUNT_CODE } }),
    tx.account.findUnique({ where: { code: COGS_ACCOUNT_CODE } }),
  ]);
  if (!inventoryAccount || !revenueAccount || !cogsAccount) {
    throw new Error("Required accounts (1200, 4000, 5000) are not configured");
  }

  const saleLines: {
    productId: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    lineCOGS: Prisma.Decimal;
  }[] = [];

  for (const line of input.lines) {
    const [product] = await tx.$queryRaw<
      { id: string; name: string; quantityOnHand: Prisma.Decimal; unitCost: Prisma.Decimal }[]
    >(Prisma.sql`SELECT * FROM "Product" WHERE id = ${line.productId} FOR UPDATE`);

    if (!product) {
      throw new Error(`Product ${line.productId} not found`);
    }

    const requestedQty = new Prisma.Decimal(line.quantity);
    const availableQty = new Prisma.Decimal(product.quantityOnHand);

    if (requestedQty.greaterThan(availableQty)) {
      throw new InsufficientStockError(
        product.name,
        availableQty.toNumber(),
        requestedQty.toNumber()
      );
    }

    const currentCost = new Prisma.Decimal(product.unitCost);
    const unitPrice = new Prisma.Decimal(line.unitPrice);

    await tx.product.update({
      where: { id: line.productId },
      data: { quantityOnHand: availableQty.minus(requestedQty) },
    });

    saleLines.push({
      productId: line.productId,
      quantity: requestedQty,
      unitPrice,
      unitCost: currentCost,
      lineTotal: requestedQty.times(unitPrice),
      lineCOGS: requestedQty.times(currentCost),
    });
  }

  const totalAmount = saleLines.reduce((sum, l) => sum.plus(l.lineTotal), new Prisma.Decimal(0));
  const totalCOGS = saleLines.reduce((sum, l) => sum.plus(l.lineCOGS), new Prisma.Decimal(0));

  const revenueEntry = await createJournalEntry(
    {
      date: input.date,
      reference: input.reference,
      memo: "Sale to customer",
      sourceType: JournalSourceType.SALE_REVENUE,
      createdById: input.createdById,
      lines: [
        { accountId: input.paymentAccountId, debit: totalAmount.toNumber(), credit: 0 },
        { accountId: revenueAccount.id, debit: 0, credit: totalAmount.toNumber() },
      ],
    },
    tx
  );

  const cogsEntry = await createJournalEntry(
    {
      date: input.date,
      reference: input.reference,
      memo: "Cost of goods sold",
      sourceType: JournalSourceType.SALE_COGS,
      createdById: input.createdById,
      lines: [
        { accountId: cogsAccount.id, debit: totalCOGS.toNumber(), credit: 0 },
        { accountId: inventoryAccount.id, debit: 0, credit: totalCOGS.toNumber() },
      ],
    },
    tx
  );

  return tx.sale.create({
    data: {
      date: input.date,
      dueDate: input.dueDate ?? null,
      customerId: input.customerId,
      salesmanId: input.salesmanId ? input.salesmanId : null,
      paymentAccountId: input.paymentAccountId,
      reference: input.reference,
      totalAmount,
      totalCOGS,
      revenueJournalEntryId: revenueEntry.id,
      cogsJournalEntryId: cogsEntry.id,
      createdById: input.createdById,
      lines: { create: saleLines },
    },
    include: { lines: { include: { product: true } }, customer: true },
  });
}

export async function recordSale(input: RecordSaleInput) {
  return prisma.$transaction((tx) => recordSaleTx(tx, input));
}

// Edit = reverse old + apply new, atomically.
export async function updateSale(saleId: string, input: RecordSaleInput) {
  return prisma.$transaction(async (tx) => {
    await reverseSaleTx(tx, saleId);
    return recordSaleTx(tx, input);
  });
}

export async function listSales() {
  return prisma.sale.findMany({
    orderBy: { date: "desc" },
    include: { customer: true, lines: true },
  });
}

export async function getSale(id: string) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      salesman: true,
      paymentAccount: true,
      revenueJournalEntry: { include: { lines: { include: { account: true } } } },
      cogsJournalEntry: { include: { lines: { include: { account: true } } } },
      lines: { include: { product: true } },
    },
  });
}
