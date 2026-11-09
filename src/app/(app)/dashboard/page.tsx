import { formatIDR } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { getAccountBalance, listCashBankAccounts } from "@/server/services/accounts.service";
import { getInventoryValue } from "@/server/services/products.service";
import { listJournalEntries } from "@/server/services/journal.service";
import {
  getMonthlyRevenue,
  getUpcomingInvoices,
  getPendingGiroList,
} from "@/server/services/dashboard.service";
import { RevenueBarChart } from "@/components/dashboard/revenue-bar-chart";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { Wallet, ArrowDownLeft, ArrowUpRight, Boxes, TrendingUp, CalendarClock, FileCheck, type LucideIcon } from "lucide-react";

function DuePill({ days, dict }: { days: number | null; dict: Record<string, string> }) {
  if (days === null) return <span className="text-xs text-muted-foreground">—</span>;
  let cls = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  let text = dict.dueIn.replace("{n}", String(days));
  if (days < 0) {
    cls = "bg-red-500/10 text-red-600 dark:text-red-400";
    text = dict.overdueBy.replace("{n}", String(Math.abs(days)));
  } else if (days === 0) {
    cls = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    text = dict.dueToday;
  } else if (days <= 7) {
    cls = "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`flex size-9 items-center justify-center rounded-lg ${tint}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

async function getAccountTotal(code: string) {
  const account = await prisma.account.findUnique({ where: { code } });
  if (!account) return 0;
  const { totalDebit, totalCredit } = await getAccountBalance(account.id);
  return account.normalBalance === "DEBIT" ? totalDebit - totalCredit : totalCredit - totalDebit;
}

export default async function DashboardPage() {
  const dict = await getDict();
  const t = dict.dashboard;
  const cashBankAccounts = await listCashBankAccounts();
  const cashBankBalances = await Promise.all(
    cashBankAccounts.map(async (account) => {
      const { totalDebit, totalCredit } = await getAccountBalance(account.id);
      return { account, balance: totalDebit - totalCredit };
    })
  );
  const totalCashBank = cashBankBalances.reduce((sum, b) => sum + b.balance, 0);

  const [
    accountsReceivable,
    accountsPayable,
    inventoryValue,
    recentEntries,
    monthlyRevenue,
    upcomingInvoices,
    pendingGiros,
  ] = await Promise.all([
    getAccountTotal("1100"),
    getAccountTotal("2000"),
    getInventoryValue(),
    listJournalEntries(),
    getMonthlyRevenue(12),
    getUpcomingInvoices(30, 7),
    getPendingGiroList(7),
  ]);

  const latestEntries = recentEntries.slice(0, 5);
  const nonZeroBalances = cashBankBalances.filter((b) => b.balance !== 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.cashBank}
          value={formatIDR(totalCashBank)}
          icon={Wallet}
          tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label={t.receivables}
          value={formatIDR(accountsReceivable)}
          icon={ArrowDownLeft}
          tint="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label={t.payables}
          value={formatIDR(accountsPayable)}
          icon={ArrowUpRight}
          tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label={t.inventoryValue}
          value={formatIDR(inventoryValue)}
          icon={Boxes}
          tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          <h2 className="text-base font-medium">{t.revenueTrend}</h2>
        </div>
        <RevenueBarChart data={monthlyRevenue} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <h2 className="text-base font-medium">{t.upcomingInvoices}</h2>
          </div>
          <div className="-mx-4 border-t">
            {upcomingInvoices.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{t.noUpcoming}</p>
            )}
            {upcomingInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b px-4 py-2.5 text-sm last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="max-w-40 truncate">{inv.customer}</span>
                  <DuePill days={inv.days} dict={t as unknown as Record<string, string>} />
                </div>
                <span className="font-medium">{formatIDR(inv.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <FileCheck className="size-4 text-muted-foreground" />
            <h2 className="text-base font-medium">{t.pendingGiros}</h2>
          </div>
          <div className="-mx-4 border-t">
            {pendingGiros.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{t.noPendingGiros}</p>
            )}
            {pendingGiros.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b px-4 py-2.5 text-sm last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{g.number}</span>
                  <span className="max-w-32 truncate">{g.customer}</span>
                  <DuePill days={g.days} dict={t as unknown as Record<string, string>} />
                </div>
                <span className="font-medium">{formatIDR(g.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-base font-medium">{t.cashBankBreakdown}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.common.account}</TableHead>
                <TableHead className="text-right">{t.balance}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nonZeroBalances.map(({ account, balance }) => (
                <TableRow key={account.id}>
                  <TableCell>
                    {account.code} — {account.name}
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(balance)}</TableCell>
                </TableRow>
              ))}
              {nonZeroBalances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    {t.noBalances}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {nonZeroBalances.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell>{dict.common.total}</TableCell>
                  <TableCell className="text-right">{formatIDR(totalCashBank)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-base font-medium">{t.recentEntries}</h2>
          <div className="-mx-4 -mb-4 border-t">
            {latestEntries.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{t.noEntries}</p>
            )}
            {latestEntries.map((entry) => {
              const total = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
              return (
                <Link
                  key={entry.id}
                  href={`/journal-entries/${entry.id}`}
                  className="flex items-center justify-between border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {entry.date.toLocaleDateString("id-ID")}
                    </span>
                    <span className="max-w-48 truncate">{entry.memo || "—"}</span>
                    <Badge variant="secondary">
                      {dict.journal.sourceLabels[entry.sourceType] ?? entry.sourceType}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatIDR(total)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
