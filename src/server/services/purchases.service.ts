import { prisma } from "@/lib/prisma";
import { Prisma, JournalSourceType } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";

const INVENTORY_ACCOUNT_CODE = "1200";

export type RecordPurchaseInput = {
  date: Date;
  dueDate?: Date | null;
  supplierId: string;
  paymentAccountId: string;
  reference?: string | null;
  createdById: string;
  lines: { productId: string; quantity: number; unitCost: number }[];
};

type Tx = Prisma.TransactionClient;

// Reverses a purchase's stock (subtract qty, recompute weighted-average cost)
// and removes the purchase + journal entry — the reversible half of an edit.
export async function reversePurchaseTx(tx: Tx, purchaseId: string) {
  const purchase = await tx.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    include: { lines: true },
  });

  for (const line of purchase.lines) {
    const [product] = await tx.$queryRaw<
      { id: string; name: string; quantityOnHand: Prisma.Decimal; unitCost: Prisma.Decimal }[]
    >(Prisma.sql`SELECT * FROM "Product" WHERE id = ${line.productId} FOR UPDATE`);
    if (!product) throw new Error(`Product ${line.productId} not found`);

    const qty = new Prisma.Decimal(product.quantityOnHand);
    const cost = new Prisma.Decimal(product.unitCost);
    const removedQty = new Prisma.Decimal(line.quantity);
    const removedValue = new Prisma.Decimal(line.lineTotal);

    const newQty = qty.minus(removedQty);
    if (newQty.isNegative()) {
      throw new Error(
        `Cannot edit/delete: ${product.name} stock would go negative (units from this purchase were already sold). Record a stock adjustment instead.`
      );
    }
    const newValue = qty.times(cost).minus(removedValue);
    const newCost = newQty.isZero() || newValue.isNegative()
      ? new Prisma.Decimal(0)
      : newValue.div(newQty);

    await tx.product.update({
      where: { id: line.productId },
      data: { quantityOnHand: newQty, unitCost: newCost },
    });
  }

  await tx.purchase.delete({ where: { id: purchaseId } });
  await tx.journalEntry.delete({ where: { id: purchase.journalEntryId } });
}

export async function recordPurchaseTx(tx: Tx, input: RecordPurchaseInput) {
  const inventoryAccount = await tx.account.findUnique({
    where: { code: INVENTORY_ACCOUNT_CODE },
  });
  if (!inventoryAccount) {
    throw new Error("Inventory account (1200) is not configured");
  }

  const purchaseLines: {
    productId: string;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }[] = [];

  for (const line of input.lines) {
    const [product] = await tx.$queryRaw<
      { id: string; quantityOnHand: Prisma.Decimal; unitCost: Prisma.Decimal; name: string }[]
    >(Prisma.sql`SELECT * FROM "Product" WHERE id = ${line.productId} FOR UPDATE`);

    if (!product) {
      throw new Error(`Product ${line.productId} not found`);
    }

    const existingQty = new Prisma.Decimal(product.quantityOnHand);
    const existingCost = new Prisma.Decimal(product.unitCost);
    const newQty = new Prisma.Decimal(line.quantity);
    const newCost = new Prisma.Decimal(line.unitCost);

    const totalQty = existingQty.plus(newQty);
    const totalValue = existingQty.times(existingCost).plus(newQty.times(newCost));
    const weightedAvgCost = totalQty.isZero() ? new Prisma.Decimal(0) : totalValue.div(totalQty);

    await tx.product.update({
      where: { id: line.productId },
      data: { quantityOnHand: totalQty, unitCost: weightedAvgCost },
    });

    purchaseLines.push({
      productId: line.productId,
      quantity: newQty,
      unitCost: newCost,
      lineTotal: newQty.times(newCost),
    });
  }

  const totalAmount = purchaseLines.reduce(
    (sum, l) => sum.plus(l.lineTotal),
    new Prisma.Decimal(0)
  );

  const journalEntry = await createJournalEntry(
    {
      date: input.date,
      reference: input.reference,
      memo: `Purchase from supplier`,
      sourceType: JournalSourceType.PURCHASE,
      createdById: input.createdById,
      lines: [
        { accountId: inventoryAccount.id, debit: totalAmount.toNumber(), credit: 0 },
        { accountId: input.paymentAccountId, debit: 0, credit: totalAmount.toNumber() },
      ],
    },
    tx
  );

  return tx.purchase.create({
    data: {
      date: input.date,
      dueDate: input.dueDate ?? null,
      supplierId: input.supplierId,
      paymentAccountId: input.paymentAccountId,
      reference: input.reference,
      totalAmount,
      journalEntryId: journalEntry.id,
      createdById: input.createdById,
      lines: { create: purchaseLines },
    },
    include: { lines: { include: { product: true } }, supplier: true, journalEntry: true },
  });
}

export async function recordPurchase(input: RecordPurchaseInput) {
  return prisma.$transaction((tx) => recordPurchaseTx(tx, input));
}

export async function updatePurchase(purchaseId: string, input: RecordPurchaseInput) {
  return prisma.$transaction(async (tx) => {
    await reversePurchaseTx(tx, purchaseId);
    return recordPurchaseTx(tx, input);
  });
}

export async function listPurchases() {
  return prisma.purchase.findMany({
    orderBy: { date: "desc" },
    include: { supplier: true, lines: true },
  });
}

export async function getPurchase(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      paymentAccount: true,
      journalEntry: { include: { lines: { include: { account: true } } } },
      lines: { include: { product: true } },
    },
  });
}
