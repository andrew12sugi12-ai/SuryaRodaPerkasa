import { listActiveAccounts } from "@/server/services/accounts.service";
import { getDict } from "@/lib/i18n/server";
import { JournalEntryForm } from "@/components/journal-entries/journal-entry-form";

export default async function NewJournalEntryPage() {
  const dict = await getDict();
  const accounts = await listActiveAccounts();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.journal.newEntryTitle}</h1>
      <JournalEntryForm
        accounts={accounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
      />
    </div>
  );
}
