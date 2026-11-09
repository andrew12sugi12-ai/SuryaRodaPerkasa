import { prisma } from "@/lib/prisma";
import { JournalSourceType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";

const INVENTORY_ACCOUNT_CODE = "1200";
const COGS_ACCOUNT_CODE = "5000";

export type LandedCostInput = {
  purchaseId: string;
  // The purchase lines the customs bill (bea masuk) applies to.
  selectedLineIds: string[];
  totalCost: number; // total additional cost (e.g. bea masuk) in IDR
  offsetAccountId: string; // where the cost is owed/paid from (payable or cash)
  date: Date;
  reference?: string | null;
  memo?: string | null;
  createdById: string;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Preview the allocation without writing anything. Spreads `totalCost` across
 * the selected purchase lines in proportion to each line's purchase value, then
 * splits each line's share between COGS (units already sold) and Inventory
 * (units still on hand, which also get their unit cost raised).
 */
export async function previewLandedCost(input: {
  purchaseId: string;
  selectedLineIds: string[];
  totalCost: number;
}) {
  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: input.purchaseId },
    include: { lines: { include: { product: true } } },
  });

  const selected = purchase.lines.filter((l) => input.selectedLineIds.includes(l.id));
  if (selected.length === 0) {
    throw new Error("Select at least one product the cost applies to");
  }

  const totalValue = selected.reduce((s, l) => s + Number(l.lineTotal), 0);
  if (totalValue <= 0) {
    throw new Error("Selected products have no value to allocate against");
  }

  const total = round2(input.totalCost);
  let allocatedSoFar = 0;

  const rows = selected.map((line, idx) => {
    const lineValue = Number(line.lineTotal);
    // Last line absorbs the rounding remainder so the parts sum exactly to total.
    const allocated =
      idx === selected.length - 1
        ? round2(total - allocatedSoFar)
        : round2((total * lineValue) / totalValue);
    allocatedSoFar += allocated;

    const purchasedQty = Number(line.quantity);
    const onHand = Number(line.product.quantityOnHand);
    // Fraction of this shipment's units assumed still in stock (capped at 1).
    const unsoldFraction = purchasedQty > 0 ? Math.min(1, onHand / purchasedQty) : 0;
    const toInventory = round2(allocated * unsoldFraction);
    const toCOGS = round2(allocated - toInventory);
    const oldUnitCost = Number(line.product.unitCost);
    const newUnitCost =
      onHand > 0 && toInventory > 0 ? round2((onHand * oldUnitCost + toInventory) / onHand) : oldUnitCost;

    return {
      purchaseLineId: line.id,
      productId: line.productId,
      sku: line.product.sku,
      name: line.product.name,
      lineValue,
      allocated,
      purchasedQty,
      onHand,
      toInventory,
      toCOGS,
      oldUnitCost,
      newUnitCost,
    };
  });

  const totalToInventory = round2(rows.reduce((s, r) => s + r.toInventory, 0));
  const totalToCOGS = round2(rows.reduce((s, r) => s + r.toCOGS, 0));

  return { rows, total, totalToInventory, totalToCOGS };
}

export async function recordLandedCost(input: LandedCostInput) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUniqueOrThrow({
      where: { id: input.purchaseId },
      include: { lines: { include: { product: true } } },
    });

    const selected = purchase.lines.filter((l) => input.selectedLineIds.includes(l.id));
    if (selected.length === 0) throw new Error("Select at least one product the cost applies to");

    const totalValue = selected.reduce((s, l) => s + Number(l.lineTotal), 0);
    if (totalValue <= 0) throw new Error("Selected products have no value to allocate against");
    if (input.totalCost <= 0) throw new Error("Enter a cost greater than zero");

    const [inventoryAccount, cogsAccount, offsetAccount] = await Promise.all([
      tx.account.findUnique({ where: { code: INVENTORY_ACCOUNT_CODE } }),
      tx.account.findUnique({ where: { code: COGS_ACCOUNT_CODE } }),
      tx.account.findUnique({ where: { id: input.offsetAccountId } }),
    ]);
    if (!inventoryAccount || !cogsAccount) {
      throw new Error("Inventory (1200) or COGS (5000) account is not configured");
    }
    if (!offsetAccount) throw new Error("Offset account not found");

    const total = round2(input.totalCost);
    let allocatedSoFar = 0;
    let totalToInventory = 0;
    let totalToCOGS = 0;

    for (let i = 0; i < selected.length; i++) {
      const line = selected[i];
      const lineValue = Number(line.lineTotal);
      const allocated =
        i === selected.length - 1
          ? round2(total - allocatedSoFar)
          : round2((total * lineValue) / totalValue);
      allocatedSoFar += allocated;

      // Re-read the product inside the loop so repeated products stay consistent.
      const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
      const purchasedQty = Number(line.quantity);
      const onHand = Number(product.quantityOnHand);
      const unsoldFraction = purchasedQty > 0 ? Math.min(1, onHand / purchasedQty) : 0;
      const toInventory = round2(allocated * unsoldFraction);
      const toCOGS = round2(allocated - toInventory);

      totalToInventory = round2(totalToInventory + toInventory);
      totalToCOGS = round2(totalToCOGS + toCOGS);

      // Raise the remaining units' weighted-average unit cost by their share.
      if (onHand > 0 && toInventory > 0) {
        const oldUnitCost = Number(product.unitCost);
        const newUnitCost = round2((onHand * oldUnitCost + toInventory) / onHand);
        await tx.product.update({
          where: { id: product.id },
          data: { unitCost: new Prisma.Decimal(newUnitCost) },
        });
      }
    }

    // Build the balanced journal entry. Dr Inventory + Dr COGS / Cr offset.
    const lines: { accountId: string; debit: number; credit: number; description?: string }[] = [];
    if (totalToInventory > 0) {
      lines.push({ accountId: inventoryAccount.id, debit: totalToInventory, credit: 0, description: "Tambahan biaya persediaan" });
    }
    if (totalToCOGS > 0) {
      lines.push({ accountId: cogsAccount.id, debit: totalToCOGS, credit: 0, description: "Tambahan HPP (unit terjual)" });
    }
    lines.push({ accountId: offsetAccount.id, debit: 0, credit: total, description: input.memo ?? "Bea masuk / landed cost" });

    const journalEntry = await createJournalEntry(
      {
        date: input.date,
        memo: input.memo || `Landed cost (bea masuk) — ${purchase.reference ?? purchase.id}`,
        reference: input.reference,
        sourceType: JournalSourceType.LANDED_COST,
        createdById: input.createdById,
        lines,
      },
      tx
    );

    return { journalEntryId: journalEntry.id, totalToInventory, totalToCOGS, total };
  });
}
