import { getBalanceSheet } from "@/server/services/reports.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import { PrintButton } from "@/components/reports/print-button";
import { ExcelButton } from "@/components/reports/excel-button";
import { reportToday } from "@/lib/report-dates";

const todayISO = reportToday;

function Row({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${indent ? "pl-4" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatIDR(amount)}</span>
    </div>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between border-t pt-1.5 text-sm font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{formatIDR(amount)}</span>
    </div>
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
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold tracking-tight">{t.balanceSheetTitle}</h1>
        <div className="flex items-end gap-3">
          <DateFilter paramName="asOf" label={t.asOf} defaultValue={todayISO()} />
          <ExcelButton href={`/api/reports/export?type=balance&end=${asOf}`} />
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto max-w-4xl rounded-xl border bg-card p-4 text-center">
        <p className="text-base font-semibold">{t.companyName}</p>
        <p className="text-sm font-medium">{t.balanceSheetTitle}</p>
        <p className="text-xs text-muted-foreground">
          {t.asOf} {new Date(`${asOf}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
        {/* AKTIVA */}
        <div className="space-y-4 rounded-xl border bg-card p-6">
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

          <div className="flex justify-between border-t-2 border-foreground/30 pt-2 text-base font-bold">
            <span>{t.totalAssets}</span>
            <span className="tabular-nums">{formatIDR(sheet.totalAssets)}</span>
          </div>
        </div>

        {/* PASIVA */}
        <div className="space-y-4 rounded-xl border bg-card p-6">
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

          <div className="flex justify-between border-t-2 border-foreground/30 pt-2 text-base font-bold">
            <span>
              {t.totalLiabilities} + {t.equity}
            </span>
            <span className="tabular-nums">{formatIDR(sheet.totalLiabilities + sheet.totalEquity)}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
            sheet.isBalanced
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {sheet.isBalanced ? t.sheetBalanced : t.sheetNotBalanced}
        </span>
      </div>
    </div>
  );
}
