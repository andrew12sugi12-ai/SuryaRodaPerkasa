import { prisma } from "@/lib/prisma";
import type { AccountInput } from "@/lib/validation/account";

export async function listAccounts() {
  return prisma.account.findMany({ orderBy: { code: "asc" } });
}

export async function listActiveAccounts() {
  return prisma.account.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

// Cash & bank accounts use codes 1000–1099 by convention.
export async function listCashBankAccounts() {
  return prisma.account.findMany({
    where: { isActive: true, type: "ASSET", code: { startsWith: "10" } },
    orderBy: { code: "asc" },
  });
}

// Accounts a sale/purchase can be settled against: any cash/bank account,
// plus the receivable (sale on credit) or payable (purchase on credit) account.
export async function listSettlementAccounts(kind: "sale" | "purchase") {
  const controlCode = kind === "sale" ? "1100" : "2000";
  return prisma.account.findMany({
    where: {
      isActive: true,
      OR: [{ type: "ASSET", code: { startsWith: "10" } }, { code: controlCode }],
    },
    orderBy: { code: "asc" },
  });
}

// Accounts a landed-cost (bea masuk) bill can be settled against: any cash/bank
// account, or any liability account (e.g. Hutang Bea Cukai, Hutang Dagang).
export async function listLandedCostOffsetAccounts() {
  return prisma.account.findMany({
    where: {
      isActive: true,
      OR: [{ type: "ASSET", code: { startsWith: "10" } }, { type: "LIABILITY" }],
    },
    orderBy: { code: "asc" },
  });
}

export async function getAccount(id: string) {
  return prisma.account.findUnique({ where: { id } });
}

export async function createAccount(input: AccountInput) {
  return prisma.account.create({
    data: {
      code: input.code,
      name: input.name,
      type: input.type,
      normalBalance: input.normalBalance,
      isActive: input.isActive,
      expenseCategory: input.type === "EXPENSE" ? (input.expenseCategory ?? "OPERATIONAL") : null,
      // Long-term only meaningful for assets & liabilities.
      isLongTerm:
        input.type === "ASSET" || input.type === "LIABILITY" ? !!input.isLongTerm : false,
    },
  });
}

export async function updateAccount(id: string, input: AccountInput) {
  return prisma.account.update({
    where: { id },
    data: {
      code: input.code,
      name: input.name,
      type: input.type,
      normalBalance: input.normalBalance,
      isActive: input.isActive,
      expenseCategory: input.type === "EXPENSE" ? (input.expenseCategory ?? "OPERATIONAL") : null,
      // Long-term only meaningful for assets & liabilities.
      isLongTerm:
        input.type === "ASSET" || input.type === "LIABILITY" ? !!input.isLongTerm : false,
    },
  });
}

export async function getAccountBalance(accountId: string, asOfDate?: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      ...(asOfDate ? { journalEntry: { date: { lte: asOfDate } } } : {}),
    },
  });

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);

  return { totalDebit, totalCredit };
}
