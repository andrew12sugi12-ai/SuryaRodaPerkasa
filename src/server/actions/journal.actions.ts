"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { journalEntrySchema, type JournalEntryInput } from "@/lib/validation/journal";
import { createJournalEntry } from "@/server/services/journal.service";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user;
}

export async function createJournalEntryAction(input: JournalEntryInput) {
  const user = await requireUser();
  const parsed = journalEntrySchema.parse(input);

  const entry = await createJournalEntry({
    date: parsed.date,
    memo: parsed.memo,
    reference: parsed.reference,
    createdById: user.id,
    lines: parsed.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    })),
  });

  revalidatePath("/journal-entries");
  return { id: entry.id };
}
