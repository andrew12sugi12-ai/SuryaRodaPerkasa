import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { logAudit } from "@/server/services/audit.service";
import { restoreStockForLineTx } from "@/server/services/sales.service";

// All deletions are admin-only (enforced in the actions layer) and unwind
// every side effect atomically: stock, journal entries, and linked records.

export async function deleteSale(saleId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { lines: true, customer: true },
    });

    // Return sold units to stock. For an assembled bike this returns its
    // components; for a normal product it returns the product's own stock.
    for (const line of sale.lines) {
      await restoreStockForLineTx(tx, line.productId, new Prisma.Decimal(line.quantity));
    }

    await tx.sale.delete({ where: { id: saleId } });
    await tx.journalEntry.delete({ where: { id: sale.revenueJournalEntryId } });
    await tx.journalEntry.delete({ where: { id: sale.cogsJournalEntryId } });

    await logAudit(
      "DELETE_SALE",
      {
        saleId,
        date: sale.date,
        customer: sale.customer.name,
        totalAmount: sale.totalAmount,
        totalCOGS: sale.totalCOGS,
        lines: sale.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      },
      adminId,
      tx
    );
  });
}

export async function deletePurchase(purchaseId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { lines: true, supplier: true },
    });

    // Reverse quantities and recompute the weighted-average cost as if this
    // purchase never happened.
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
          `Cannot delete: ${product.name} stock would go negative (units from this purchase were already sold). Record a stock adjustment instead.`
        );
      }
      const newValue = qty.times(cost).minus(removedValue);
      if (newValue.isNegative()) {
        throw new Error(
          `Cannot delete: ${product.name} inventory value would go negative. Record a stock adjustment instead.`
        );
      }
      const newCost = newQty.isZero() ? new Prisma.Decimal(0) : newValue.div(newQty);

      await tx.product.update({
        where: { id: line.productId },
        data: { quantityOnHand: newQty, unitCost: newCost },
      });
    }

    await tx.purchase.delete({ where: { id: purchaseId } });
    await tx.journalEntry.delete({ where: { id: purchase.journalEntryId } });

    await logAudit(
      "DELETE_PURCHASE",
      {
        purchaseId,
        date: purchase.date,
        supplier: purchase.supplier.name,
        totalAmount: purchase.totalAmount,
        lines: purchase.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
        })),
      },
      adminId,
      tx
    );
  });
}

export async function deletePayment(paymentId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { customer: true, supplier: true },
    });

    await tx.payment.delete({ where: { id: paymentId } });
    await tx.journalEntry.delete({ where: { id: payment.journalEntryId } });
    // A giro/cek that was cleared or bounced has a second journal entry
    // (Dr Bank / Cr Giro-in-Transit, or the bounce reversal). Delete it too,
    // otherwise the bank / giro-in-transit side is left dangling.
    if (payment.clearJournalEntryId) {
      await tx.journalEntry.delete({ where: { id: payment.clearJournalEntryId } });
    }

    await logAudit(
      "DELETE_PAYMENT",
      {
        paymentId,
        date: payment.date,
        type: payment.type,
        party: payment.customer?.name ?? payment.supplier?.name,
        amount: payment.amount,
      },
      adminId,
      tx
    );
  });
}

// Expenses and manual entries are plain journal entries with no side effects,
// so deletion is just removing the entry (lines cascade).
export async function deleteJournalEntry(entryId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.findUniqueOrThrow({
      where: { id: entryId },
      include: { lines: { include: { account: true } }, purchase: true, saleRevenue: true, saleCOGS: true, payment: true },
    });

    if (entry.purchase || entry.saleRevenue || entry.saleCOGS || entry.payment) {
      throw new Error(
        "This entry belongs to a purchase, sale, or payment — delete that transaction instead."
      );
    }
    if (entry.sourceType === "ADJUSTMENT") {
      throw new Error(
        "Stock adjustment entries cannot be deleted — record a new adjustment to correct the count."
      );
    }

    await tx.journalEntry.delete({ where: { id: entryId } });

    await logAudit(
      entry.sourceType === "EXPENSE" ? "DELETE_EXPENSE" : "DELETE_JOURNAL_ENTRY",
      {
        entryId,
        date: entry.date,
        memo: entry.memo,
        sourceType: entry.sourceType,
        lines: entry.lines.map((l) => ({
          account: `${l.account.code} ${l.account.name}`,
          debit: l.debit,
          credit: l.credit,
        })),
      },
      adminId,
      tx
    );
  });
}

// Master-data deletions (admin-only). Blocked when the record has history, to
// protect the books — the user should deactivate (set Inactive) instead.
export async function deleteAccount(accountId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
    const lineCount = await tx.journalLine.count({ where: { accountId } });
    if (lineCount > 0) {
      throw new Error(
        "This account has journal entries and cannot be deleted. Set it Inactive instead."
      );
    }
    await tx.account.delete({ where: { id: accountId } });
    await logAudit("DELETE_ACCOUNT", { accountId, code: account.code, name: account.name }, adminId, tx);
  });
}

export async function deleteCustomer(customerId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
    const [saleCount, paymentCount] = await Promise.all([
      tx.sale.count({ where: { customerId } }),
      tx.payment.count({ where: { customerId } }),
    ]);
    if (saleCount > 0 || paymentCount > 0) {
      throw new Error(
        "This customer has sales or payments and cannot be deleted. Set it Inactive instead."
      );
    }
    await tx.customer.delete({ where: { id: customerId } });
    await logAudit("DELETE_CUSTOMER", { customerId, name: customer.name }, adminId, tx);
  });
}

export async function deleteSupplier(supplierId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    const [purchaseCount, paymentCount] = await Promise.all([
      tx.purchase.count({ where: { supplierId } }),
      tx.payment.count({ where: { supplierId } }),
    ]);
    if (purchaseCount > 0 || paymentCount > 0) {
      throw new Error(
        "This supplier has purchases or payments and cannot be deleted. Set it Inactive instead."
      );
    }
    await tx.supplier.delete({ where: { id: supplierId } });
    await logAudit("DELETE_SUPPLIER", { supplierId, name: supplier.name }, adminId, tx);
  });
}
