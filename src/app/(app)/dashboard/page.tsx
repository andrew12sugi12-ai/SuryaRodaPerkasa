import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { getAccountBalance, listCashBankAccounts } from "@/server/services/accounts.service";
import { getInventoryValue } from "@/server/services/products.service";
import { listJournalEntries } from "@/server/services/journal.service";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const [accountsReceivable, accountsPayable, inventoryValue, recentEntries] =
    await Promise.all([
      getAccountTotal("1100"),
      getAccountTotal("2000"),
      getInventoryValue(),
      listJournalEntries(),
    ]);

  const latestEntries = recentEntries.slice(0, 5);
  const nonZeroBalances = cashBankBalances.filter((b) => b.balance !== 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.cashBank}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatIDR(totalCashBank)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.receivables}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatIDR(accountsReceivable)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.payables}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatIDR(accountsPayable)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.inventoryValue}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatIDR(inventoryValue)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">{t.cashBankBreakdown}</h2>
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

        <div className="space-y-3">
          <h2 className="text-lg font-medium">{t.recentEntries}</h2>
          <div className="rounded-md border">
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
