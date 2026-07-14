import { getIncomeStatement } from "@/server/services/reports.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { DateFilter } from "@/components/reports/date-filter";
import { Separator } from "@/components/ui/separator";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function ExpenseSection({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { code: string; name: string; amount: number }[];
  total: number;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      {rows.map((r) => (
        <div key={r.code} className="flex justify-between text-sm">
          <span>{r.name}</span>
          <span>{formatIDR(r.amount)}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between text-sm font-medium">
        <span>Total {title}</span>
        <span>{formatIDR(total)}</span>
      </div>
    </section>
  );
}

export default async function IncomeStatementPage({
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

  const statement = await getIncomeStatement(startDate, endDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.reports.incomeStatementTitle}</h1>
        <div className="flex gap-3">
          <DateFilter paramName="start" label={dict.reports.from} defaultValue={firstOfMonthISO()} />
          <DateFilter paramName="end" label={dict.reports.to} defaultValue={todayISO()} />
        </div>
      </div>

      <div className="max-w-xl space-y-4 rounded-md border p-6">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">{dict.reports.revenue}</h2>
          {statement.revenueRows.map((r) => (
            <div key={r.code} className="flex justify-between text-sm">
              <span>{r.name}</span>
              <span>{formatIDR(r.amount)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between text-sm font-medium">
            <span>{dict.reports.totalRevenue}</span>
            <span>{formatIDR(statement.revenue)}</span>
          </div>
        </section>

        <Separator />

        <ExpenseSection
          title={dict.reports.cogsSection}
          rows={statement.cogsRows}
          total={statement.cogs}
        />

        <Separator />

        <div className="flex justify-between font-medium">
          <span>{dict.reports.grossProfit}</span>
          <span>{formatIDR(statement.grossProfit)}</span>
        </div>

        <Separator />

        <ExpenseSection
          title="B. Operasional"
          rows={statement.operationalRows}
          total={statement.operationalTotal}
        />
        <ExpenseSection
          title="B. Tetap"
          rows={statement.fixedRows}
          total={statement.fixedTotal}
        />
        <ExpenseSection
          title="B. Sales"
          rows={statement.salesExpenseRows}
          total={statement.salesExpenseTotal}
        />
        <ExpenseSection
          title="B. Lain-Lain"
          rows={statement.otherRows}
          total={statement.otherTotal}
        />

        <Separator />

        <div className="flex justify-between text-sm font-medium">
          <span>{dict.reports.totalExpenses}</span>
          <span>{formatIDR(statement.operatingExpenses)}</span>
        </div>

        <div className="flex justify-between text-lg font-semibold">
          <span>{dict.reports.netIncome}</span>
          <span>{formatIDR(statement.netIncome)}</span>
        </div>
      </div>
    </div>
  );
}
