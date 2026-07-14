import { notFound } from "next/navigation";
import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { getJournalEntry } from "@/server/services/journal.service";
import { auth } from "@/auth";
import { deleteJournalEntryAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { LinkButton } from "@/components/ui/link-button";
import { formatIDR } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function JournalEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const session = await auth();
  const { id } = await params;
  const entry = await getJournalEntry(id);
  if (!entry) notFound();

  // Manual & expense entries are editable by everyone; deletable by admins only.
  const isEditable =
    (entry.sourceType === "MANUAL" || entry.sourceType === "EXPENSE") &&
    !entry.purchase &&
    !entry.saleRevenue &&
    !entry.saleCOGS;
  const isDeletable = session?.user.role === "ADMIN" && isEditable;

  const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.journal.entryTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {entry.date.toLocaleDateString("id-ID")} · {entry.memo || dict.journal.noMemo}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{dict.journal.sourceLabels[entry.sourceType] ?? entry.sourceType}</Badge>
          {isEditable && (
            <LinkButton href={`/journal-entries/${entry.id}/edit`} variant="outline" size="sm">
              {dict.common.edit}
            </LinkButton>
          )}
          {isDeletable && (
            <ConfirmDeleteButton
              action={deleteJournalEntryAction.bind(null, entry.id)}
              description={`${dict.journal.entryTitle}: ${entry.memo ?? entry.id} — ${entry.date.toLocaleDateString("id-ID")}`}
              redirectTo="/journal-entries"
            />
          )}
        </div>
      </div>

      {entry.reference && (
        <p className="text-sm text-muted-foreground">{dict.common.reference}: {entry.reference}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.account}</TableHead>
            <TableHead>{dict.common.description}</TableHead>
            <TableHead className="text-right">{dict.common.debit}</TableHead>
            <TableHead className="text-right">{dict.common.credit}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entry.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                {line.account.code} — {line.account.name}
              </TableCell>
              <TableCell className="text-muted-foreground">{line.description || "—"}</TableCell>
              <TableCell className="text-right">
                {Number(line.debit) > 0 ? formatIDR(line.debit) : ""}
              </TableCell>
              <TableCell className="text-right">
                {Number(line.credit) > 0 ? formatIDR(line.credit) : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>{dict.common.total}</TableCell>
            <TableCell className="text-right">{formatIDR(totalDebit)}</TableCell>
            <TableCell className="text-right">{formatIDR(totalCredit)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <p className="text-sm text-muted-foreground">
        {dict.journal.createdByOn
          .replace("{name}", entry.createdBy.name)
          .replace("{date}", entry.createdAt.toLocaleString("id-ID"))}
      </p>

      {entry.purchase && (
        <p className="text-sm">
          <Link href={`/purchases/${entry.purchase.id}`} className="underline">
            {dict.journal.linkedToPurchase}
          </Link>
        </p>
      )}
      {entry.saleRevenue && (
        <p className="text-sm">
          <Link href={`/sales/${entry.saleRevenue.id}`} className="underline">
            {dict.journal.linkedToSale}
          </Link>{" "}
          ({dict.journal.revenue})
        </p>
      )}
      {entry.saleCOGS && (
        <p className="text-sm">
          <Link href={`/sales/${entry.saleCOGS.id}`} className="underline">
            {dict.journal.linkedToSale}
          </Link>{" "}
          ({dict.journal.cogs})
        </p>
      )}
    </div>
  );
}
