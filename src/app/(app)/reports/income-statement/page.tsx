import { Fragment } from "react";
import { getIncomeStatement } from "@/server/services/reports.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import { PrintButton } from "@/components/reports/print-button";
import { ExcelButton } from "@/components/reports/excel-button";

import { reportToday, reportFirstOfMonth } from "@/lib/report-dates";

const todayISO = reportToday;
const firstOfMonthISO = reportFirstOfMonth;

function fmtDMY(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Row = { code: string; name: string; amount: number };

function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={2} className="pt-4 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </td>
    </tr>
  );
}

function LineRow({ label, amount }: { label: string; amount: number }) {
  return (
    <tr>
      <td className="py-1 pl-4">{label}</td>
      <td className="py-1 text-right tabular-nums">{formatIDR(amount)}</td>
    </tr>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <tr className="border-t">
      <td className="py-1.5 font-medium">{label}</td>
      <td className="py-1.5 text-right font-medium tabular-nums">{formatIDR(amount)}</td>
    </tr>
  );
}

function TotalRow({
  label,
  amount,
  color,
  big,
}: {
  label: string;
  amount: number;
  color?: boolean;
  big?: boolean;
}) {
  const amountCls = color
    ? amount >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400"
    : "";
  return (
    <tr className="border-t-2 border-foreground/30">
      <td className={`py-2 font-semibold ${big ? "text-base" : ""}`}>{label}</td>
      <td className={`py-2 text-right font-semibold tabular-nums ${big ? "text-base" : ""} ${amountCls}`}>
        {formatIDR(amount)}
      </td>
    </tr>
  );
}

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const dict = await getDict();
  const t = dict.reports;
  const params = await searchParams;
  const start = params.start ?? firstOfMonthISO();
  const end = params.end ?? todayISO();
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  const s = await getIncomeStatement(startDate, endDate);

  const expenseGroups: { title: string; rows: Row[]; total: number }[] = [
    { title: t.expOperational, rows: s.operationalRows, total: s.operationalTotal },
    { title: t.expFixed, rows: s.fixedRows, total: s.fixedTotal },
    { title: t.expSales, rows: s.salesExpenseRows, total: s.salesExpenseTotal },
    { title: t.expOther, rows: s.otherRows, total: s.otherTotal },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold tracking-tight">{t.incomeStatementTitle}</h1>
        <div className="flex items-end gap-3">
          <DateFilter paramName="start" label={t.from} defaultValue={firstOfMonthISO()} />
          <DateFilter paramName="end" label={t.to} defaultValue={todayISO()} />
          <ExcelButton href={`/api/reports/export?type=income&start=${start}&end=${end}`} />
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6">
        <div className="mb-3 border-b pb-3 text-center">
          <p className="text-base font-semibold">{t.companyName}</p>
          <p className="text-sm font-medium">{t.incomeStatementTitle}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDMY(start)} – {fmtDMY(end)}
          </p>
        </div>

        <table className="w-full text-sm">
          <tbody>
            <SectionHeader title={t.revenue} />
            {s.revenueRows.map((r) => (
              <LineRow key={r.code} label={r.name} amount={r.amount} />
            ))}
            <SubtotalRow label={t.totalRevenue} amount={s.revenue} />

            <SectionHeader title={t.cogsSection} />
            {s.cogsRows.map((r) => (
              <LineRow key={r.code} label={r.name} amount={r.amount} />
            ))}
            <SubtotalRow label={`Total ${t.cogsSection}`} amount={s.cogs} />

            <TotalRow label={t.grossProfit} amount={s.grossProfit} color />

            {expenseGroups.map((g) => (
              <Fragment key={g.title}>
                <SectionHeader title={g.title} />
                {g.rows.map((r) => (
                  <LineRow key={r.code} label={r.name} amount={r.amount} />
                ))}
                <SubtotalRow label={`Total ${g.title}`} amount={g.total} />
              </Fragment>
            ))}

            <SubtotalRow label={t.totalExpenses} amount={s.operatingExpenses} />
            <TotalRow label={t.netIncome} amount={s.netIncome} color big />
          </tbody>
        </table>
      </div>
    </div>
  );
}
