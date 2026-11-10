import { prisma } from "@/lib/prisma";
import { JournalSourceType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { ProductInput } from "@/lib/validation/product";

const INVENTORY_ACCOUNT_CODE = "1200";
const OWNERS_EQUITY_ACCOUNT_CODE = "3000";
const ADJUSTMENT_ACCOUNT_CODE = "6890";

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: [{ category: "asc" }, { sku: "asc" }],
    include: {
      components: { include: { component: true } },
      usedInBikes: { select: { id: true } },
    },
  });
}

export async function listActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sku: "asc" }],
  });
}

// For the SALES picker: everything that can be put on an invoice — spare parts
// and finished bikes — but NOT bike components (they're never sold on their own).
export async function listSellableProducts() {
  return prisma.product.findMany({
    where: { isActive: true, usedInBikes: { none: {} } },
    orderBy: [{ category: "asc" }, { sku: "asc" }],
    include: { components: { include: { component: true } } },
  });
}

// For the PURCHASE picker: everything that carries its own stock — spare parts
// and bike components — but NOT bikes (bikes are assembled, never bought).
export async function listStockableProducts() {
  return prisma.product.findMany({
    where: { isActive: true, components: { none: {} } },
    orderBy: [{ category: "asc" }, { sku: "asc" }],
  });
}

// Candidate parts that can be added to a bike's bill of materials: any active
// product that is not itself a bike (no nesting), excluding the bike being edited.
export async function listComponentCandidates(excludeProductId?: string) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      components: { none: {} },
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    orderBy: [{ category: "asc" }, { sku: "asc" }],
  });
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { components: { include: { component: true } } },
  });
}

export async function createProduct(input: ProductInput, createdById: string) {
  const components = input.components ?? [];
  const isBike = components.length > 0;
  // A bike carries no stock of its own — its value lives in its components.
  const openingQty = isBike ? 0 : input.openingQuantity ?? 0;
  const openingCost = isBike ? 0 : input.openingUnitCost ?? 0;
  const openingValue = openingQty * openingCost;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        category: input.category,
        unitPrice: input.unitPrice ?? 0,
        isActive: input.isActive,
        quantityOnHand: new Prisma.Decimal(openingQty),
        unitCost: new Prisma.Decimal(openingCost),
        components: {
          create: components.map((c) => ({
            componentId: c.componentId,
            quantity: new Prisma.Decimal(c.quantity),
          })),
        },
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
  const components = input.components ?? [];
  return prisma.$transaction(async (tx) => {
    // Replace the bill of materials wholesale (simplest correct approach).
    await tx.productComponent.deleteMany({ where: { bikeId: id } });
    return tx.product.update({
      where: { id },
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        category: input.category,
        unitPrice: input.unitPrice ?? 0,
        isActive: input.isActive,
        components: {
          create: components.map((c) => ({
            componentId: c.componentId,
            quantity: new Prisma.Decimal(c.quantity),
          })),
        },
      },
    });
  });
}

// Permanently remove a product. Refuses when deleting would corrupt the books:
// a product with any purchase/sale/return history is kept (use Inactive), and a
// part still used in a bike must be detached first. A finished bike's own
// bill-of-materials rows are cleared as part of the delete.
//
// If the product still carries stock, that inventory value is sitting in the
// Inventory ledger (1200). Deleting the product without unwinding it would leave
// 1200 overstated on the Neraca/Trial Balance with no product behind it. A
// deletable product never has purchases/sales (those are blocked below), so its
// stock can only come from opening stock — which was posted Dr Persediaan 1200 /
// Cr Modal 3000. Deleting is therefore a REVERSAL of that opening entry
// (Dr Modal 3000 / Cr Persediaan 1200), NOT a business loss: it must not hit the
// income statement.
export async function deleteProduct(id: string, createdById?: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        quantityOnHand: true,
        unitCost: true,
        _count: {
          select: {
            purchaseLines: true,
            saleLines: true,
            salesReturnLines: true,
            usedInBikes: true,
          },
        },
      },
    });
    if (!product) throw new Error("Product not found");

    const { purchaseLines, saleLines, salesReturnLines, usedInBikes } = product._count;
    if (purchaseLines + saleLines + salesReturnLines > 0) {
      throw new Error("DELETE_BLOCKED_HISTORY");
    }
    if (usedInBikes > 0) {
      throw new Error("DELETE_BLOCKED_COMPONENT");
    }

    // Reverse the product's remaining stock value out of Inventory (1200)
    // against Owner's Equity (3000) — the mirror of the opening-stock entry — so
    // deleting the product leaves the books balanced WITHOUT booking a P&L loss.
    const remaining = new Prisma.Decimal(product.quantityOnHand).times(product.unitCost);
    if (!remaining.isZero() && createdById) {
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
          memo: `Hapus produk ${product.sku}: reversal sisa stok awal (${product.quantityOnHand})`,
          sourceType: JournalSourceType.MANUAL,
          createdById,
          lines: [
            { accountId: equityAccount.id, debit: remaining.toNumber(), credit: 0 },
            { accountId: inventoryAccount.id, debit: 0, credit: remaining.toNumber() },
          ],
        },
        tx
      );
    }

    // Clear this bike's own bill of materials, then remove the product.
    await tx.productComponent.deleteMany({ where: { bikeId: id } });
    await tx.product.delete({ where: { id } });
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
