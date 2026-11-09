import { getTrialBalance } from "@/server/services/reports.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import { PrintButton } from "@/components/reports/print-button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { reportToday } from "@/lib/report-dates";

const todayISO = reportToday;

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const dict = await getDict();
  const params = await searchParams;
  const asOf = params.asOf ?? todayISO();
  const asOfDate = new Date(`${asOf}T23:59:59`);

  const { rows, totalDebit, totalCredit, isBalanced } = await getTrialBalance(asOfDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.reports.trialBalanceTitle}</h1>
        <div className="flex items-end gap-3">
          <DateFilter paramName="asOf" label={dict.reports.asOf} defaultValue={todayISO()} />
          <PrintButton />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.code}</TableHead>
            <TableHead>{dict.common.account}</TableHead>
            <TableHead className="text-right">{dict.common.debit}</TableHead>
            <TableHead className="text-right">{dict.common.credit}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows
            .filter((r) => r.totalDebit !== 0 || r.totalCredit !== 0)
            .map((row) => (
              <TableRow key={row.accountId}>
                <TableCell className="font-mono">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right">
                  {row.totalDebit !== 0 ? formatIDR(row.totalDebit) : ""}
                </TableCell>
                <TableCell className="text-right">
                  {row.totalCredit !== 0 ? formatIDR(row.totalCredit) : ""}
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
      </div>

      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
          isBalanced
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
      >
        {isBalanced ? dict.reports.booksBalanced : dict.reports.booksNotBalanced}
      </span>
    </div>
  );
}
