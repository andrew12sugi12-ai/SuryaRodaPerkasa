import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getJournalEntry } from "@/server/services/journal.service";
import { listActiveAccounts } from "@/server/services/accounts.service";
import { JournalEntryForm } from "@/components/journal-entries/journal-entry-form";

export default async function EditJournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const [entry, accounts] = await Promise.all([
    getJournalEntry(id),
    listActiveAccounts(),
  ]);
  if (!entry) notFound();

  // Only manual/expense entries are editable here.
  const editable =
    (entry.sourceType === "MANUAL" || entry.sourceType === "EXPENSE") &&
    !entry.purchase &&
    !entry.saleRevenue &&
    !entry.saleCOGS;
  if (!editable) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dict.common.edit} — {dict.journal.entryTitle}
      </h1>
      <JournalEntryForm
        entryId={entry.id}
        accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
        defaultValues={{
          date: entry.date,
          memo: entry.memo ?? "",
          reference: entry.reference ?? "",
          lines: entry.lines.map((l) => ({
            accountId: l.accountId,
            debit: Number(l.debit),
            credit: Number(l.credit),
            description: l.description ?? "",
          })),
        }}
      />
    </div>
  );
}
