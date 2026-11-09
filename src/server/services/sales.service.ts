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

// Restore stock when a sale is reversed. For an assembled bike this returns each
// component to stock (by its per-bike quantity); for a normal product it returns
// the product's own stock. Uses the bike's CURRENT bill of materials.
export async function restoreStockForLineTx(
  tx: Tx,
  productId: string,
  quantity: Prisma.Decimal
) {
  const bom = await tx.productComponent.findMany({ where: { bikeId: productId } });
  if (bom.length > 0) {
    for (const part of bom) {
      await tx.product.update({
        where: { id: part.componentId },
        data: {
          quantityOnHand: { increment: quantity.times(new Prisma.Decimal(part.quantity)) },
        },
      });
    }
  } else {
    await tx.product.update({
      where: { id: productId },
      data: { quantityOnHand: { increment: quantity } },
    });
  }
}

// Restores stock for a sale's lines and removes the sale + its two journal
// entries — the reversible half of an edit, usable inside a shared transaction.
export async function reverseSaleTx(tx: Tx, saleId: string) {
  const sale = await tx.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { lines: true },
  });
  for (const line of sale.lines) {
    await restoreStockForLineTx(tx, line.productId, new Prisma.Decimal(line.quantity));
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
    const requestedQty = new Prisma.Decimal(line.quantity);
    const unitPrice = new Prisma.Decimal(line.unitPrice);

    // Is this product an assembled bike (has a bill of materials)?
    const bom = await tx.productComponent.findMany({ where: { bikeId: line.productId } });

    let unitCost: Prisma.Decimal;

    if (bom.length > 0) {
      // Bike: consume each component from stock; the bike's per-unit cost is the
      // sum of (component average cost × quantity used per bike).
      unitCost = new Prisma.Decimal(0);
      for (const part of bom) {
        const [comp] = await tx.$queryRaw<
          { id: string; name: string; quantityOnHand: Prisma.Decimal; unitCost: Prisma.Decimal }[]
        >(Prisma.sql`SELECT * FROM "Product" WHERE id = ${part.componentId} FOR UPDATE`);
        if (!comp) throw new Error(`Component ${part.componentId} not found`);

        const perBike = new Prisma.Decimal(part.quantity);
        const needed = requestedQty.times(perBike);
        const available = new Prisma.Decimal(comp.quantityOnHand);

        if (needed.greaterThan(available)) {
          throw new InsufficientStockError(
            comp.name,
            available.toNumber(),
            needed.toNumber()
          );
        }

        await tx.product.update({
          where: { id: comp.id },
          data: { quantityOnHand: available.minus(needed) },
        });

        unitCost = unitCost.plus(perBike.times(new Prisma.Decimal(comp.unitCost)));
      }
    } else {
      // Normal product (spare part): consume its own stock at its average cost.
      const [product] = await tx.$queryRaw<
        { id: string; name: string; quantityOnHand: Prisma.Decimal; unitCost: Prisma.Decimal }[]
      >(Prisma.sql`SELECT * FROM "Product" WHERE id = ${line.productId} FOR UPDATE`);

      if (!product) {
        throw new Error(`Product ${line.productId} not found`);
      }

      const availableQty = new Prisma.Decimal(product.quantityOnHand);
      if (requestedQty.greaterThan(availableQty)) {
        throw new InsufficientStockError(
          product.name,
          availableQty.toNumber(),
          requestedQty.toNumber()
        );
      }

      await tx.product.update({
        where: { id: line.productId },
        data: { quantityOnHand: availableQty.minus(requestedQty) },
      });

      unitCost = new Prisma.Decimal(product.unitCost);
    }

    saleLines.push({
      productId: line.productId,
      quantity: requestedQty,
      unitPrice,
      unitCost,
      lineTotal: requestedQty.times(unitPrice),
      lineCOGS: requestedQty.times(unitCost),
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
