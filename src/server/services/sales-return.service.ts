import { prisma } from "@/lib/prisma";
import { JournalSourceType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";

const AR_ACCOUNT_CODE = "1100";
const INVENTORY_ACCOUNT_CODE = "1200";
const SALES_RETURNS_ACCOUNT_CODE = "4900"; // Retur & Potongan Penjualan
const COGS_ACCOUNT_CODE = "5000";

export type SalesReturnInput = {
  saleId: string;
  date: Date;
  reason?: string | null;
  number?: string | null;
  restock: boolean;
  lines: { saleLineId: string; quantity: number }[];
  createdById: string;
};

// How many units of each product on a sale have already been returned.
export async function getReturnedQtyByProduct(saleId: string) {
  const rows = await prisma.salesReturnLine.groupBy({
    by: ["productId"],
    where: { salesReturn: { saleId } },
    _sum: { quantity: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.productId, Number(r._sum.quantity ?? 0));
  return map;
}

export async function recordSalesReturn(input: SalesReturnInput) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: input.saleId },
      include: { lines: true, paymentAccount: true },
    });

    // Already-returned quantities per product (across prior nota kredit).
    const retRows = await tx.salesReturnLine.groupBy({
      by: ["productId"],
      where: { salesReturn: { saleId: sale.id } },
      _sum: { quantity: true },
    });
    const alreadyReturned = new Map<string, number>();
    for (const r of retRows) alreadyReturned.set(r.productId, Number(r._sum.quantity ?? 0));

    // Original sold qty per product.
    const soldByProduct = new Map<string, number>();
    for (const l of sale.lines) {
      soldByProduct.set(l.productId, (soldByProduct.get(l.productId) ?? 0) + Number(l.quantity));
    }

    const returnLines: {
      productId: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      lineTotal: number;
      lineCOGS: number;
    }[] = [];

    const requestedByProduct = new Map<string, number>();

    for (const req of input.lines) {
      if (req.quantity <= 0) continue;
      const orig = sale.lines.find((l) => l.id === req.saleLineId);
      if (!orig) throw new Error("Sale line not found");

      requestedByProduct.set(
        orig.productId,
        (requestedByProduct.get(orig.productId) ?? 0) + req.quantity
      );

      const unitPrice = Number(orig.unitPrice);
      const unitCost = Number(orig.unitCost);
      returnLines.push({
        productId: orig.productId,
        quantity: req.quantity,
        unitPrice,
        unitCost,
        lineTotal: Math.round(req.quantity * unitPrice * 100) / 100,
        lineCOGS: Math.round(req.quantity * unitCost * 100) / 100,
      });
    }

    if (returnLines.length === 0) throw new Error("Nothing selected to return");

    // Validate: total returned per product must not exceed what was sold.
    for (const [productId, qty] of requestedByProduct) {
      const sold = soldByProduct.get(productId) ?? 0;
      const prior = alreadyReturned.get(productId) ?? 0;
      if (qty + prior > sold + 1e-9) {
        throw new Error("Return quantity exceeds what was sold for a product");
      }
    }

    const totalAmount = returnLines.reduce((s, l) => s + l.lineTotal, 0);
    const totalCOGS = returnLines.reduce((s, l) => s + l.lineCOGS, 0);

    const [returnsAccount, arAccount, inventoryAccount, cogsAccount] = await Promise.all([
      tx.account.findUnique({ where: { code: SALES_RETURNS_ACCOUNT_CODE } }),
      tx.account.findUnique({ where: { code: AR_ACCOUNT_CODE } }),
      tx.account.findUnique({ where: { code: INVENTORY_ACCOUNT_CODE } }),
      tx.account.findUnique({ where: { code: COGS_ACCOUNT_CODE } }),
    ]);
    if (!returnsAccount || !arAccount || !inventoryAccount || !cogsAccount) {
      throw new Error("Retur (4900), AR (1100), Inventory (1200) or COGS (5000) account missing");
    }

    // Was the original sale on credit? Then the return reduces AR; otherwise
    // it refunds the cash/bank account the sale was settled into.
    const settledToAR = sale.paymentAccount.code === AR_ACCOUNT_CODE;
    const creditAccountId = settledToAR ? arAccount.id : sale.paymentAccountId;

    // Revenue reversal: Dr Retur Penjualan / Cr AR-or-cash.
    const revenueEntry = await createJournalEntry(
      {
        date: input.date,
        memo: `Retur penjualan — ${sale.reference ?? sale.id}${input.reason ? ` (${input.reason})` : ""}`,
        reference: input.number ?? sale.reference,
        sourceType: JournalSourceType.SALE_RETURN,
        createdById: input.createdById,
        lines: [
          { accountId: returnsAccount.id, debit: totalAmount, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: totalAmount },
        ],
      },
      tx
    );

    // Inventory reversal only when goods are restocked.
    let cogsEntryId: string | null = null;
    if (input.restock && totalCOGS > 0) {
      const cogsEntry = await createJournalEntry(
        {
          date: input.date,
          memo: `Retur persediaan — ${sale.reference ?? sale.id}`,
          reference: input.number ?? sale.reference,
          sourceType: JournalSourceType.SALE_RETURN,
          createdById: input.createdById,
          lines: [
            { accountId: inventoryAccount.id, debit: totalCOGS, credit: 0 },
            { accountId: cogsAccount.id, debit: 0, credit: totalCOGS },
          ],
        },
        tx
      );
      cogsEntryId = cogsEntry.id;

      // Restock each product. A returned bike puts its components back into
      // stock; a returned spare part is restocked, recomputing its weighted-
      // average unit cost.
      for (const rl of returnLines) {
        const bom = await tx.productComponent.findMany({ where: { bikeId: rl.productId } });
        if (bom.length > 0) {
          for (const part of bom) {
            await tx.product.update({
              where: { id: part.componentId },
              data: {
                quantityOnHand: {
                  increment: new Prisma.Decimal(rl.quantity).times(new Prisma.Decimal(part.quantity)),
                },
              },
            });
          }
          continue;
        }
        const product = await tx.product.findUniqueOrThrow({ where: { id: rl.productId } });
        const oldQty = Number(product.quantityOnHand);
        const oldCost = Number(product.unitCost);
        const newQty = oldQty + rl.quantity;
        const newCost =
          newQty > 0 ? Math.round(((oldQty * oldCost + rl.quantity * rl.unitCost) / newQty) * 100) / 100 : oldCost;
        await tx.product.update({
          where: { id: rl.productId },
          data: { quantityOnHand: new Prisma.Decimal(newQty), unitCost: new Prisma.Decimal(newCost) },
        });
      }
    }

    return tx.salesReturn.create({
      data: {
        number: input.number,
        date: input.date,
        saleId: sale.id,
        customerId: sale.customerId,
        reason: input.reason,
        totalAmount: new Prisma.Decimal(totalAmount),
        totalCOGS: new Prisma.Decimal(totalCOGS),
        restock: input.restock,
        settledToAR,
        revenueJournalEntryId: revenueEntry.id,
        cogsJournalEntryId: cogsEntryId,
        createdById: input.createdById,
        lines: {
          create: returnLines.map((l) => ({
            productId: l.productId,
            quantity: new Prisma.Decimal(l.quantity),
            unitPrice: new Prisma.Decimal(l.unitPrice),
            unitCost: new Prisma.Decimal(l.unitCost),
            lineTotal: new Prisma.Decimal(l.lineTotal),
            lineCOGS: new Prisma.Decimal(l.lineCOGS),
          })),
        },
      },
    });
  });
}

export async function listSalesReturns() {
  return prisma.salesReturn.findMany({
    orderBy: { date: "desc" },
    include: { customer: true, sale: true },
  });
}

export async function getSalesReturn(id: string) {
  return prisma.salesReturn.findUnique({
    where: { id },
    include: { customer: true, sale: true, lines: { include: { product: true } } },
  });
}
