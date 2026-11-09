import { getAnalytics } from "@/server/services/analytics.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { reportToday, reportFirstOfMonth } from "@/lib/report-dates";

const todayISO = reportToday;
const firstOfMonthISO = reportFirstOfMonth;

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CATEGORY_STYLES: Record<string, string> = {
  FAST: "text-green-600 dark:text-green-400",
  NORMAL: "text-muted-foreground",
  SLOW: "text-amber-600 dark:text-amber-400",
  DEAD: "text-red-600 dark:text-red-400",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const dict = await getDict();
  const t = dict.analytics;
  const sp = await searchParams;
  const fromISO = sp.from ?? firstOfMonthISO();
  const toISO = sp.to ?? todayISO();
  const startDate = new Date(`${fromISO}T00:00:00`);
  const endDate = new Date(`${toISO}T23:59:59`);

  const data = await getAnalytics(startDate, endDate);
  const catLabel = (c: string) =>
    ({ FAST: t.fast, NORMAL: t.normal, SLOW: t.slow, DEAD: t.dead } as Record<string, string>)[c];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.nav.analytics}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <DateFilter paramName="from" label={dict.reports.from} defaultValue={fromISO} />
          <DateFilter paramName="to" label={dict.reports.to} defaultValue={toISO} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.totalRevenue} value={formatIDR(data.totals.revenue)} />
        <StatCard
          label={t.grossProfit}
          value={formatIDR(data.totals.grossProfit)}
          sub={`${t.margin}: ${data.totals.marginPct.toFixed(1)}%`}
        />
        <StatCard label={t.invoices} value={String(data.totals.invoices)} />
        <StatCard label={t.deadStockItems} value={String(data.totals.deadStock)} />
      </div>

      {/* Salesman performance */}
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
                    {s.attainmentPct === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={s.attainmentPct >= 100 ? "text-green-600 dark:text-green-400" : ""}>
                        {s.attainmentPct.toFixed(0)}%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data.salesmanPerformance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
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
              {data.topCustomers.slice(0, 15).map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.invoices}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(c.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(c.grossProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.marginPct.toFixed(1)}%</TableCell>
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

      {/* Product movement */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{t.productMovement}</h2>
        <p className="text-sm text-muted-foreground">{t.productMovementHelp}</p>
        <div className="rounded-xl border bg-card p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.product}</TableHead>
                <TableHead className="text-right">{t.unitsSold}</TableHead>
                <TableHead className="text-right">{t.onHand}</TableHead>
                <TableHead className="text-right">{t.daysOfStock}</TableHead>
                <TableHead className="text-right">{t.revenue}</TableHead>
                <TableHead className="text-right">{t.margin}</TableHead>
                <TableHead className="text-right">{t.movement}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.productMovement.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-medium">{p.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">{p.sku}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.unitsSold}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.onHand}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.daysOfStock === null ? "—" : Math.round(p.daysOfStock)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatIDR(p.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.marginPct.toFixed(1)}%</TableCell>
                  <TableCell className={`text-right font-medium ${CATEGORY_STYLES[p.category]}`}>
                    {catLabel(p.category)}
                  </TableCell>
                </TableRow>
              ))}
              {data.productMovement.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t.noProducts}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
