import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { PrintButton } from "@/components/reports/print-button";
import type { LedgerEntry } from "@/server/services/balances.service";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function KartuLedger({
  title,
  subtitle,
  entries,
  balance,
}: {
  title: string;
  subtitle: string;
  entries: LedgerEntry[];
  balance: number;
}) {
  const dict = await getDict();
  const t = dict.contacts;

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <PrintButton />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{t.description}</TableHead>
            <TableHead>{dict.common.reference}</TableHead>
            <TableHead className="text-right">{dict.common.debit}</TableHead>
            <TableHead className="text-right">{dict.common.credit}</TableHead>
            <TableHead className="text-right">{t.runningBalance}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="whitespace-nowrap">
                {e.date.getTime() === 0 ? "—" : e.date.toLocaleDateString("id-ID")}
              </TableCell>
              <TableCell>
                {e.href ? (
                  <Link href={e.href} className="underline-offset-2 hover:underline">
                    {e.description}
                  </Link>
                ) : (
                  e.description
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{e.ref || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {e.debit ? formatIDR(e.debit) : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {e.credit ? formatIDR(e.credit) : ""}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatIDR(e.balance)}</TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t.noSalesYet}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {entries.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>{t.runningBalance}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatIDR(balance)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </section>
  );
}
