import { prisma } from "@/lib/prisma";
import { logAudit } from "@/server/services/audit.service";

// Wipes all operational + master data so the books start clean, while KEEPING
// user logins. The chart of accounts is preserved (accounts themselves are
// kept; only their transactions are removed). Used for "reset after staff
// play around". Runs in one transaction so it's all-or-nothing.
export async function resetAllData(adminId: string) {
  await prisma.$transaction(async (tx) => {
    // Order matters: children before parents (FK constraints).
    await tx.saleLine.deleteMany({});
    await tx.purchaseLine.deleteMany({});
    await tx.sale.deleteMany({});
    await tx.purchase.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.journalLine.deleteMany({});
    await tx.journalEntry.deleteMany({});
    await tx.product.deleteMany({});
    await tx.customer.deleteMany({});
    await tx.supplier.deleteMany({});
    await tx.periodLock.deleteMany({});

    // Keep users and the chart of accounts. Reset any login lockouts too.
    await tx.user.updateMany({ data: { failedLoginCount: 0, lockedUntil: null } });
  });

  // Audit log is written after the wipe (the wipe clears older logs too).
  await logAudit("RESET_ALL_DATA", { note: "All transactions and master data cleared; users kept." }, adminId);
}
