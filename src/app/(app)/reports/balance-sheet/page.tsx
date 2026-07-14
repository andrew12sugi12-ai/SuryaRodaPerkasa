import Link from "next/link";
import { getBalanceSheet } from "@/server/services/reports.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Row({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${indent ? "pl-4" : ""}`}>
      <span>{label}</span>
      <span>{formatIDR(amount)}</span>
    </div>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between border-t pt-1.5 text-sm font-semibold">
      <span>{label}</span>
      <span>{formatIDR(amount)}</span>
    </div>
  );
}

function DetailSchedule({
  title,
  rows,
  total,
  totalLabel,
  href,
  code,
  account,
  common,
}: {
  title: string;
  rows: { id: string; name: string; amount: number }[];
  total: number;
  totalLabel: string;
  href: (id: string) => string;
  code?: never;
  account: string;
  common: { total: string };
}) {
  if (rows.length === 0) return null;
  return (
    <section className="max-w-xl space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{account}</TableHead>
            <TableHead className="text-right">{totalLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={href(r.id)} className="underline-offset-2 hover:underline">
                  {r.name}
                </Link>
              </TableCell>
              <TableCell className="text-right">{formatIDR(r.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>{common.total}</TableCell>
            <TableCell className="text-right">{formatIDR(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </section>
  );
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const dict = await getDict();
  const params = await searchParams;
  const asOf = params.asOf ?? todayISO();
  const asOfDate = new Date(`${asOf}T23:59:59`);

  const sheet = await getBalanceSheet(asOfDate);
  const t = dict.reports;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t.balanceSheetTitle}</h1>
        <DateFilter paramName="asOf" label={t.asOf} defaultValue={todayISO()} />
      </div>

      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        {/* AKTIVA */}
        <div className="space-y-4 rounded-md border p-6">
          <h2 className="text-base font-semibold">{t.assets}</h2>

          <section className="space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">{t.currentAssets}</h3>
            <Row label={t.cashAndBank} amount={sheet.cashBankTotal} indent />
            {sheet.otherCurrentAssetRows.map((r) => (
              <Row key={r.accountId} label={r.name} amount={r.balance} indent />
            ))}
            <SubtotalRow label={t.totalCurrentAssets} amount={sheet.totalCurrentAssets} />
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">{t.longTermAssets}</h3>
            {sheet.longTermAssetRows.map((r) => (
              <Row key={r.accountId} label={r.name} amount={r.balance} indent />
            ))}
            {sheet.longTermAssetRows.length === 0 && (
              <p className="pl-4 text-sm text-muted-foreground">—</p>
            )}
            <SubtotalRow label={t.totalLongTermAssets} amount={sheet.totalLongTermAssets} />
          </section>

          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>{t.totalAssets}</span>
            <span>{formatIDR(sheet.totalAssets)}</span>
          </div>
        </div>

        {/* PASIVA */}
        <div className="space-y-4 rounded-md border p-6">
          <h2 className="text-base font-semibold">
            {t.liabilities} &amp; {t.equity}
          </h2>

          <section className="space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t.currentLiabilities}
            </h3>
            {sheet.currentLiabilityRows.map((r) => (
              <Row key={r.accountId} label={r.name} amount={r.balance} indent />
            ))}
            {sheet.currentLiabilityRows.length === 0 && (
              <p className="pl-4 text-sm text-muted-foreground">—</p>
            )}
            <SubtotalRow
              label={t.totalCurrentLiabilities}
              amount={sheet.totalCurrentLiabilities}
            />
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t.longTermLiabilities}
            </h3>
            {sheet.longTermLiabilityRows.map((r) => (
              <Row key={r.accountId} label={r.name} amount={r.balance} indent />
            ))}
            {sheet.longTermLiabilityRows.length === 0 && (
              <p className="pl-4 text-sm text-muted-foreground">—</p>
            )}
            <SubtotalRow
              label={t.totalLongTermLiabilities}
              amount={sheet.totalLongTermLiabilities}
            />
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">{t.equity}</h3>
            {sheet.equityRows.map((r) => (
              <Row key={r.accountId} label={r.name} amount={r.balance} indent />
            ))}
            <Row label={t.currentEarnings} amount={sheet.currentEarnings} indent />
            <SubtotalRow label={t.totalEquity} amount={sheet.totalEquity} />
          </section>

          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>
              {t.totalLiabilities} + {t.equity}
            </span>
            <span>{formatIDR(sheet.totalLiabilities + sheet.totalEquity)}</span>
          </div>
        </div>
      </div>

      <p className={sheet.isBalanced ? "text-sm text-green-600" : "text-sm text-destructive"}>
        {sheet.isBalanced ? t.sheetBalanced : t.sheetNotBalanced}
      </p>

      {/* Supporting schedules */}
      <section className="max-w-xl space-y-3">
        <h2 className="text-lg font-medium">{t.cashDetail}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.code}</TableHead>
              <TableHead>{dict.common.account}</TableHead>
              <TableHead className="text-right">{dict.dashboard.balance}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheet.cashBankRows.map((r) => (
              <TableRow key={r.accountId}>
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right">{formatIDR(r.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.common.total}</TableCell>
              <TableCell className="text-right">{formatIDR(sheet.cashBankTotal)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <p className="text-xs text-muted-foreground">
          {t.addBankHint}{" "}
          <Link href="/accounts/new" className="underline">
            {dict.accounts.newAccount} →
          </Link>
        </p>
      </section>

      <DetailSchedule
        title={t.receivablesDetail}
        rows={sheet.receivablesDetail}
        total={sheet.receivablesDetail.reduce((s, r) => s + r.amount, 0)}
        totalLabel={t.receivablesDetail}
        href={(id) => `/customers/${id}`}
        account={dict.sales.customer}
        common={{ total: dict.common.total }}
      />

      <DetailSchedule
        title={t.payablesDetail}
        rows={sheet.payablesDetail}
        total={sheet.payablesDetail.reduce((s, r) => s + r.amount, 0)}
        totalLabel={t.payablesDetail}
        href={(id) => `/suppliers/${id}`}
        account={dict.purchases.supplier}
        common={{ total: dict.common.total }}
      />
    </div>
  );
}
