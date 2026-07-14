import { prisma } from "@/lib/prisma";
import { Prisma, JournalSourceType } from "@/generated/prisma";
import { UnbalancedEntryError } from "@/server/errors";
import { assertPeriodOpen } from "@/server/services/period.service";

type DbClient = typeof prisma | Prisma.TransactionClient;

export type JournalLineData = {
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
};

export type CreateJournalEntryInput = {
  date: Date;
  memo?: string | null;
  reference?: string | null;
  sourceType?: JournalSourceType;
  createdById: string;
  lines: JournalLineData[];
};

export async function createJournalEntry(
  input: CreateJournalEntryInput,
  db: DbClient = prisma
) {
  await assertPeriodOpen(input.date, input.createdById);

  if (input.lines.length < 2) {
    throw new Error("A journal entry requires at least two lines");
  }

  for (const line of input.lines) {
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;
    if (hasDebit === hasCredit) {
      throw new Error(
        "Each journal line must have exactly one of debit or credit greater than zero"
      );
    }
  }

  const totalDebit = input.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = input.lines.reduce((sum, l) => sum + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new UnbalancedEntryError(totalDebit, totalCredit);
  }

  return db.journalEntry.create({
    data: {
      date: input.date,
      memo: input.memo,
      reference: input.reference,
      sourceType: input.sourceType ?? JournalSourceType.MANUAL,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: new Prisma.Decimal(line.debit),
          credit: new Prisma.Decimal(line.credit),
          description: line.description,
        })),
      },
    },
    include: { lines: { include: { account: true } } },
  });
}

// Editing only applies to manual/expense entries. Transaction-linked entries
// (purchase/sale/payment/adjustment) must be edited via their own transaction.
export async function updateJournalEntry(
  id: string,
  input: Omit<CreateJournalEntryInput, "sourceType">
) {
  const existing = await prisma.journalEntry.findUniqueOrThrow({
    where: { id },
    include: { purchase: true, saleRevenue: true, saleCOGS: true, payment: true },
  });
  if (existing.purchase || existing.saleRevenue || existing.saleCOGS || existing.payment) {
    throw new Error(
      "This entry belongs to a purchase, sale, or payment — edit that transaction instead."
    );
  }
  if (existing.sourceType === "ADJUSTMENT") {
    throw new Error("Stock adjustment entries cannot be edited — record a new adjustment.");
  }

  await assertPeriodOpen(input.date, input.createdById);

  if (input.lines.length < 2) throw new Error("A journal entry requires at least two lines");
  for (const line of input.lines) {
    if ((line.debit > 0) === (line.credit > 0)) {
      throw new Error("Each line must have exactly one of debit or credit greater than zero");
    }
  }
  const totalDebit = input.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = input.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    throw new UnbalancedEntryError(totalDebit, totalCredit);
  }

  return prisma.$transaction(async (tx) => {
    await tx.journalLine.deleteMany({ where: { journalEntryId: id } });
    return tx.journalEntry.update({
      where: { id },
      data: {
        date: input.date,
        memo: input.memo,
        reference: input.reference,
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            debit: new Prisma.Decimal(line.debit),
            credit: new Prisma.Decimal(line.credit),
            description: line.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  });
}

export async function listJournalEntries() {
  return prisma.journalEntry.findMany({
    orderBy: { date: "desc" },
    include: {
      lines: { include: { account: true } },
      createdBy: true,
    },
  });
}

export async function getJournalEntry(id: string) {
  return prisma.journalEntry.findUnique({
    where: { id },
    include: {
      lines: { include: { account: true } },
      createdBy: true,
      purchase: true,
      saleRevenue: true,
      saleCOGS: true,
    },
  });
}
