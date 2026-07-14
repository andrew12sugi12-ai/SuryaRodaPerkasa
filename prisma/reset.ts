import { PrismaClient } from "../src/generated/prisma";

// CLI equivalent of the in-app "Reset Data": clears all transactions and
// master data, keeps users and the chart of accounts. Run: npm run db:reset
const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
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
    await tx.user.updateMany({ data: { failedLoginCount: 0, lockedUntil: null } });
  });
  console.log("Reset complete: transactions & master data cleared; users and accounts kept.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
