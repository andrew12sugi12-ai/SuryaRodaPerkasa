import { getAnalytics } from "@/server/services/analytics.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import { PrintButton } from "@/components/reports/print-button";
import { ExcelButton } from "@/components/reports/excel-button";
import { reportToday, reportFirstOfMonth } from "@/lib/report-dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const todayISO = reportToday;
const firstOfMonthISO = reportFirstOfMonth;

function fmtDMY(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function PerformanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const dict = await getDict();
  const t = dict.analytics;
  const r = dict.reports;
  const sp = await searchParams;
  const startISO = sp.start ?? firstOfMonthISO();
  const endISO = sp.end ?? todayISO();
  const startDate = new Date(`${startISO}T00:00:00`);
  const endDate = new Date(`${endISO}T23:59:59`);

  const data = await getAnalytics(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <h1 className="text-2xl font-semibold tracking-tight">{r.performanceTitle}</h1>
        <div className="flex items-end gap-3">
          <DateFilter paramName="start" label={r.from} defaultValue={startISO} />
          <DateFilter paramName="end" label={r.to} defaultValue={endISO} />
          <ExcelButton href={`/api/reports/export?type=performance&start=${startISO}&end=${endISO}`} />
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto max-w-5xl rounded-xl border bg-card p-4 text-center">
        <p className="text-base font-semibold">{r.companyName}</p>
        <p className="text-sm font-medium">{r.performanceTitle}</p>
        <p className="text-xs text-muted-foreground">
          {fmtDMY(startISO)} — {fmtDMY(endISO)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.totalRevenue} value={formatIDR(data.totals.revenue)} />
        <StatCard
          label={t.grossProfit}
          value={formatIDR(data.totals.grossProfit)}
          sub={`${t.margin}: ${data.totals.marginPct.toFixed(1)}%`}
        />
        <StatCard label={t.invoices} value={String(data.totals.invoices)} />
        <StatCard label={t.deadStockItems} value={String(data.totals.deadStockCount)} />
      </div>

      {/* Salesman sales */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{t.salesmanPerformance}</h2>
        <div className="rounded-xl border bg-card p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.salesman}</TableHead>
                <TableHead className="text-right">{t.toko}</TableHead>
                <TableHead className="text-right">{t.invoices}</TableHead>
                <TableHead className="text-right">{t.revenue}</TableHead>
                <TableHead className="text-right">{t.grossProfit}</TableHead>
                <TableHead className="text-right">{t.margin}</TableHead>
                <TableHead className="text-right">{r.target}</TableHead>
                <TableHead className="text-right">{t.attainment}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.salesmanPerformance.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.tokoCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.invoices}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(s.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(s.grossProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.marginPct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.target > 0 ? formatIDR(s.target) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.attainmentPct === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={s.attainmentPct >= 100 ? "text-success" : ""}>
                        {s.attainmentPct.toFixed(0)}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.salesmanPerformance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {t.noSalesmen}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Top toko */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{t.topToko}</h2>
        <div className="rounded-xl border bg-card p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>{t.toko}</TableHead>
                <TableHead className="text-right">{t.invoices}</TableHead>
                <TableHead className="text-right">{t.revenue}</TableHead>
                <TableHead className="text-right">{t.grossProfit}</TableHead>
                <TableHead className="text-right">{t.margin}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.slice(0, 15).map((cst, i) => (
                <TableRow key={cst.id}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{cst.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{cst.invoices}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(cst.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(cst.grossProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{cst.marginPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {data.topCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t.noSales}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Marketing KPIs — placeholder until connected */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{r.marketingKpis}</h2>
        <div className="rounded-xl border border-dashed bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{r.kpiPlaceholder}</p>
        </div>
      </section>
    </div>
  );
}
