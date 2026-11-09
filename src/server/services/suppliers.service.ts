import { prisma } from "@/lib/prisma";
import { JournalSourceType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { SupplierInput } from "@/lib/validation/supplier";

const AP_ACCOUNT_CODE = "2000";
const OWNERS_EQUITY_ACCOUNT_CODE = "3000";

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function listActiveSuppliers() {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

// Opening balance: an amount already owed to this supplier before this
// system was set up. Recorded as Dr Owner's Equity / Cr Hutang Dagang.
export async function createSupplier(input: SupplierInput, createdById?: string) {
  const openingBalance = input.openingBalance ?? 0;

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        name: input.name,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        isActive: input.isActive,
        openingBalance: new Prisma.Decimal(openingBalance),
      },
    });

    if (openingBalance > 0 && createdById) {
      const [apAccount, equityAccount] = await Promise.all([
        tx.account.findUnique({ where: { code: AP_ACCOUNT_CODE } }),
        tx.account.findUnique({ where: { code: OWNERS_EQUITY_ACCOUNT_CODE } }),
      ]);
      if (!apAccount || !equityAccount) {
        throw new Error("Hutang Dagang (2000) or Owner's Equity (3000) account is not configured");
      }
      await createJournalEntry(
        {
          date: new Date(),
          memo: `Opening balance — ${input.name}`,
          sourceType: JournalSourceType.MANUAL,
          createdById,
          lines: [
            { accountId: equityAccount.id, debit: openingBalance, credit: 0 },
            { accountId: apAccount.id, debit: 0, credit: openingBalance },
          ],
        },
        tx
      );
    }

    return supplier;
  });
}

export async function updateSupplier(id: string, input: SupplierInput) {
  // Opening balance is set once (at creation/import) and backed by a journal
  // entry; editing it here would desync the ledger, so it is not updatable.
  // The due date is informational and may be adjusted.
  // openingBalance is set once (creation/import) and is backed by a journal
  // entry; it is not changed on edit here.
  const { openingBalance: _openingBalance, ...rest } = input;
  return prisma.supplier.update({ where: { id }, data: rest });
}
