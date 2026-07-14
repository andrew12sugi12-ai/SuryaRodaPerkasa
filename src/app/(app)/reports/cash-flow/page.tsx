import { getCashFlow } from "@/server/services/reports.service";
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

function firstOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between pl-4 text-sm">
      <span>{label}</span>
      <span className={amount < 0 ? "text-destructive" : ""}>{formatIDR(amount)}</span>
    </div>
  );
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const dict = await getDict();
  const params = await searchParams;
  const start = params.start ?? firstOfMonthISO();
  const end = params.end ?? todayISO();
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  const flow = await getCashFlow(startDate, endDate);
  const t = dict.reports;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t.cashFlowTitle}</h1>
        <div className="flex gap-3">
          <DateFilter paramName="start" label={t.from} defaultValue={firstOfMonthISO()} />
          <DateFilter paramName="end" label={t.to} defaultValue={todayISO()} />
        </div>
      </div>

      <div className="max-w-xl space-y-4 rounded-md border p-6">
        <div className="flex justify-between text-sm font-medium">
          <span>{t.openingBalance}</span>
          <span>{formatIDR(flow.openingBalance)}</span>
        </div>

        <Separator />

        <section className="space-y-1.5">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.operatingActivities}
          </h2>
          <Row label={t.salesReceipts} amount={flow.salesReceipts} />
          <Row label={t.customerReceipts} amount={flow.customerReceipts} />
          <Row label={t.purchasePayments} amount={flow.purchasePayments} />
          <Row label={t.supplierPayments} amount={flow.supplierPayments} />
          <Row label={t.expensePayments} amount={flow.expensePayments} />
          <div className="flex justify-between border-t pt-2 text-sm font-semibold">
            <span>{t.netOperating}</span>
            <span className={flow.netOperating < 0 ? "text-destructive" : ""}>
              {formatIDR(flow.netOperating)}
            </span>
          </div>
        </section>

        <section className="space-y-1.5">
          <Row label={t.otherMovements} amount={flow.otherMovements} />
        </section>

        <Separator />

        <div className="flex justify-between text-sm font-semibold">
          <span>{t.netChange}</span>
          <span className={flow.netChange < 0 ? "text-destructive" : ""}>
            {formatIDR(flow.netChange)}
          </span>
        </div>

        <div className="flex justify-between text-lg font-bold">
          <span>{t.closingBalance}</span>
          <span>{formatIDR(flow.closingBalance)}</span>
        </div>
      </div>

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
            {flow.closingByAccount.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right">{formatIDR(r.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.common.total}</TableCell>
              <TableCell className="text-right">{formatIDR(flow.closingBalance)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>
    </div>
  );
}
