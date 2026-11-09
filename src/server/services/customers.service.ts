import { prisma } from "@/lib/prisma";
import { JournalSourceType, Prisma } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { CustomerInput } from "@/lib/validation/customer";

const AR_ACCOUNT_CODE = "1100";
const OWNERS_EQUITY_ACCOUNT_CODE = "3000";

export async function listCustomers() {
  return prisma.customer.findMany({ orderBy: { name: "asc" } });
}

export async function listActiveCustomers() {
  return prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({ where: { id } });
}

// Opening balance: an amount the customer already owed before this system
// was set up. Recorded as Dr Piutang Dagang / Cr Owner's Equity, mirroring
// how Product opening stock is posted.
export async function createCustomer(input: CustomerInput, createdById?: string) {
  const openingBalance = input.openingBalance ?? 0;

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name: input.name,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        isActive: input.isActive,
        openingBalance: new Prisma.Decimal(openingBalance),
        creditLimit: new Prisma.Decimal(input.creditLimit ?? 0),
        termDays: input.termDays ?? 0,
        cashOnly: input.cashOnly ?? false,
        salesmanId: input.salesmanId ? input.salesmanId : null,
      },
    });

    if (openingBalance > 0 && createdById) {
      const [arAccount, equityAccount] = await Promise.all([
        tx.account.findUnique({ where: { code: AR_ACCOUNT_CODE } }),
        tx.account.findUnique({ where: { code: OWNERS_EQUITY_ACCOUNT_CODE } }),
      ]);
      if (!arAccount || !equityAccount) {
        throw new Error("Piutang Dagang (1100) or Owner's Equity (3000) account is not configured");
      }
      await createJournalEntry(
        {
          date: new Date(),
          memo: `Opening balance — ${input.name}`,
          sourceType: JournalSourceType.MANUAL,
          createdById,
          lines: [
            { accountId: arAccount.id, debit: openingBalance, credit: 0 },
            { accountId: equityAccount.id, debit: 0, credit: openingBalance },
          ],
        },
        tx
      );
    }

    return customer;
  });
}

export async function updateCustomer(id: string, input: CustomerInput) {
  // Opening balance is set once (at creation/import) and backed by a journal
  // entry; editing it here would desync the ledger, so it is not updatable.
  // The due date is informational and may be adjusted.
  // openingBalance is set once (creation/import) and is backed by a journal
  // entry; it is not changed on edit here.
  const { openingBalance: _openingBalance, creditLimit, termDays, cashOnly, salesmanId, ...rest } =
    input;
  return prisma.customer.update({
    where: { id },
    data: {
      ...rest,
      creditLimit: new Prisma.Decimal(creditLimit ?? 0),
      termDays: termDays ?? 0,
      cashOnly: cashOnly ?? false,
      salesmanId: salesmanId ? salesmanId : null,
    },
  });
}
