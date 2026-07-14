import { prisma } from "@/lib/prisma";
import { JournalSourceType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { ProductInput } from "@/lib/validation/product";

const INVENTORY_ACCOUNT_CODE = "1200";
const OWNERS_EQUITY_ACCOUNT_CODE = "3000";
const ADJUSTMENT_ACCOUNT_CODE = "6890";

export async function listProducts() {
  return prisma.product.findMany({ orderBy: { sku: "asc" } });
}

export async function listActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sku: "asc" },
  });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}

export async function createProduct(input: ProductInput, createdById: string) {
  const openingQty = input.openingQuantity ?? 0;
  const openingCost = input.openingUnitCost ?? 0;
  const openingValue = openingQty * openingCost;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        unitPrice: input.unitPrice ?? 0,
        isActive: input.isActive,
        quantityOnHand: new Prisma.Decimal(openingQty),
        unitCost: new Prisma.Decimal(openingCost),
      },
    });

    // Opening stock has value: post Dr Inventory / Cr Owner's Equity so the
    // ledger's Inventory account stays in sync with product records.
    if (openingValue > 0) {
      const [inventoryAccount, equityAccount] = await Promise.all([
        tx.account.findUnique({ where: { code: INVENTORY_ACCOUNT_CODE } }),
        tx.account.findUnique({ where: { code: OWNERS_EQUITY_ACCOUNT_CODE } }),
      ]);
      if (!inventoryAccount || !equityAccount) {
        throw new Error("Inventory (1200) or Owner's Equity (3000) account is not configured");
      }

      await createJournalEntry(
        {
          date: new Date(),
          memo: `Opening stock — ${input.sku}`,
          sourceType: JournalSourceType.MANUAL,
          createdById,
          lines: [
            { accountId: inventoryAccount.id, debit: openingValue, credit: 0 },
            { accountId: equityAccount.id, debit: 0, credit: openingValue },
          ],
        },
        tx
      );
    }

    return product;
  });
}

export async function updateProduct(id: string, input: ProductInput) {
  return prisma.product.update({
    where: { id },
    data: {
      sku: input.sku,
      name: input.name,
      description: input.description,
      unitPrice: input.unitPrice ?? 0,
      isActive: input.isActive,
    },
  });
}

export async function getInventoryValue() {
  const products = await prisma.product.findMany();
  return products.reduce(
    (sum, p) => sum + Number(p.quantityOnHand) * Number(p.unitCost),
    0
  );
}

export async function adjustStock(input: {
  productId: string;
  actualQuantity: number;
  reason: string;
  createdById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const [product] = await tx.$queryRaw<
      { id: string; sku: string; name: string; quantityOnHand: Prisma.Decimal; unitCost: Prisma.Decimal }[]
    >(Prisma.sql`SELECT * FROM "Product" WHERE id = ${input.productId} FOR UPDATE`);
    if (!product) throw new Error("Product not found");

    const current = new Prisma.Decimal(product.quantityOnHand);
    const actual = new Prisma.Decimal(input.actualQuantity);
    const diff = actual.minus(current);
    if (diff.isZero()) {
      throw new Error("Quantity is already " + current.toString() + " — nothing to adjust");
    }

    const cost = new Prisma.Decimal(product.unitCost);
    const value = diff.abs().times(cost);

    const [inventoryAccount, adjustmentAccount] = await Promise.all([
      tx.account.findUnique({ where: { code: INVENTORY_ACCOUNT_CODE } }),
      tx.account.findUnique({ where: { code: ADJUSTMENT_ACCOUNT_CODE } }),
    ]);
    if (!inventoryAccount || !adjustmentAccount) {
      throw new Error("Inventory (1200) or Penyesuaian Persediaan (6890) account is not configured");
    }

    await tx.product.update({
      where: { id: input.productId },
      data: { quantityOnHand: actual },
    });

    // Loss (actual < recorded): Dr Penyesuaian / Cr Persediaan.
    // Gain (actual > recorded): Dr Persediaan / Cr Penyesuaian, valued at avg cost.
    if (!value.isZero()) {
      const isLoss = diff.isNegative();
      await createJournalEntry(
        {
          date: new Date(),
          memo: `Opname ${product.sku}: ${input.reason} (${current} -> ${actual})`,
          sourceType: JournalSourceType.ADJUSTMENT,
          createdById: input.createdById,
          lines: isLoss
            ? [
                { accountId: adjustmentAccount.id, debit: value.toNumber(), credit: 0 },
                { accountId: inventoryAccount.id, debit: 0, credit: value.toNumber() },
              ]
            : [
                { accountId: inventoryAccount.id, debit: value.toNumber(), credit: 0 },
                { accountId: adjustmentAccount.id, debit: 0, credit: value.toNumber() },
              ],
        },
        tx
      );
    }
  });
}
