import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { listJournalEntries } from "@/server/services/journal.service";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function JournalEntriesPage() {
  const dict = await getDict();
  const entries = await listJournalEntries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.journal.title}</h1>
        <LinkButton href="/journal-entries/new">{dict.journal.newEntry}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{dict.common.memo}</TableHead>
            <TableHead>{dict.journal.source}</TableHead>
            <TableHead className="text-right">{dict.common.amount}</TableHead>
            <TableHead>{dict.common.createdBy}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const total = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
            return (
              <TableRow key={entry.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/journal-entries/${entry.id}`} className="block">
                    {entry.date.toLocaleDateString("id-ID")}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/journal-entries/${entry.id}`} className="block">
                    {entry.memo || <span className="text-muted-foreground">—</span>}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {dict.journal.sourceLabels[entry.sourceType] ?? entry.sourceType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatIDR(total)}</TableCell>
                <TableCell>{entry.createdBy.name}</TableCell>
              </TableRow>
            );
          })}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {dict.journal.noEntries}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
