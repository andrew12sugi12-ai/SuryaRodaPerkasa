import { prisma } from "@/lib/prisma";
import { JournalSourceType } from "@/generated/prisma";
import { createJournalEntry } from "@/server/services/journal.service";
import type { ExpenseInput } from "@/lib/validation/expense";

// Each quick-expense category posts to a catch-all account, so day-to-day
// entries never require creating new accounts. Specific accounts can still be
// used via manual journal entries.
const CATEGORY_ACCOUNT_CODES: Record<ExpenseInput["category"], string> = {
  OPERATIONAL: "6400",
  FIXED: "6600",
  SALES: "6800",
  OTHER: "6900",
};

export async function recordExpense(input: ExpenseInput & { createdById: string }) {
  const categoryCode = CATEGORY_ACCOUNT_CODES[input.category];
  const expenseAccount = await prisma.account.findUnique({ where: { code: categoryCode } });
  if (!expenseAccount) {
    throw new Error(`Expense account ${categoryCode} is not configured`);
  }

  return createJournalEntry({
    date: input.date,
    memo: input.description,
    sourceType: JournalSourceType.EXPENSE,
    createdById: input.createdById,
    lines: [
      { accountId: expenseAccount.id, debit: input.amount, credit: 0 },
      { accountId: input.paidFromAccountId, debit: 0, credit: input.amount },
    ],
  });
}

export type ExpenseRow = {
  id: string;
  date: Date;
  description: string;
  category: string;
  paidFrom: string;
  amount: number;
  createdBy: string;
};

export async function listExpenses(start: Date, end: Date): Promise<ExpenseRow[]> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      sourceType: JournalSourceType.EXPENSE,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { lines: { include: { account: true } }, createdBy: true },
  });

  return entries.map((entry) => {
    const debitLine = entry.lines.find((l) => Number(l.debit) > 0);
    const creditLine = entry.lines.find((l) => Number(l.credit) > 0);
    return {
      id: entry.id,
      date: entry.date,
      description: entry.memo ?? "",
      category: debitLine?.account.expenseCategory ?? "OTHER",
      paidFrom: creditLine ? `${creditLine.account.code} — ${creditLine.account.name}` : "",
      amount: Number(debitLine?.debit ?? 0),
      createdBy: entry.createdBy.name,
    };
  });
}
