import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { TrendingUp, FileSpreadsheet, ArrowLeftRight, BarChart3 } from "lucide-react";
import { reportYearMonth, isoFromLocalDate } from "@/lib/report-dates";
import { ExcelButton } from "@/components/reports/excel-button";

const iso = isoFromLocalDate;

export default async function MonthlyReportsPage() {
  const dict = await getDict();
  const { year, month } = reportYearMonth();

  const months = Array.from({ length: 12 }, (_, i) => {
    const first = new Date(year, month - i, 1);
    const last = new Date(year, month - i + 1, 0);
    return {
      label: first.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      start: iso(first),
      end: iso(last),
    };
  });

  const links = (m: { start: string; end: string }) => [
    {
      label: dict.reports.incomeStatementTitle,
      href: `/reports/income-statement?start=${m.start}&end=${m.end}`,
      icon: TrendingUp,
    },
    {
      label: dict.reports.balanceSheetTitle,
      href: `/reports/balance-sheet?asOf=${m.end}`,
      icon: FileSpreadsheet,
    },
    {
      label: dict.nav.cashFlow,
      href: `/reports/cash-flow?start=${m.start}&end=${m.end}`,
      icon: ArrowLeftRight,
    },
    {
      label: dict.reports.performanceTitle,
      href: `/reports/performance?start=${m.start}&end=${m.end}`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.reports.monthlyTitle}</h1>
        <p className="text-sm text-muted-foreground">{dict.reports.monthlyHint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => (
          <div key={m.start} className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-medium capitalize">{m.label}</h2>
              <ExcelButton
                href={`/api/reports/export?type=combined&start=${m.start}&end=${m.end}`}
                label="Excel"
                variant="ghost"
                className="h-8 px-2 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              {links(m).map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="size-4 text-muted-foreground/70" />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
