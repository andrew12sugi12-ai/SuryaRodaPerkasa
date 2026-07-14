import { listExpenses } from "@/server/services/expenses.service";
import { auth } from "@/auth";
import { deleteJournalEntryAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { listCashBankAccounts } from "@/server/services/accounts.service";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { getDict } from "@/lib/i18n/server";
import { MonthFilter } from "@/components/expenses/month-filter";
import { formatIDR } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function currentMonthISO() {
  return new Date().toISOString().slice(0, 7);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const dict = await getDict();
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const params = await searchParams;
  const month = params.month ?? currentMonthISO();
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0, 23, 59, 59);

  const [expenses, accounts] = await Promise.all([
    listExpenses(start, end),
    listCashBankAccounts(),
  ]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalsByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.expenses.title}</h1>
        <MonthFilter defaultValue={currentMonthISO()} />
      </div>

      <ExpenseForm
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
      />

      <div className="flex flex-wrap gap-3 text-sm">
        {Object.entries(totalsByCategory).map(([cat, amount]) => (
          <div key={cat} className="rounded-md border px-3 py-2">
            <span className="text-muted-foreground">{dict.expenses.categories[cat] ?? cat}: </span>
            <span className="font-medium">{formatIDR(amount)}</span>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{dict.common.description}</TableHead>
            <TableHead>{dict.expenses.category}</TableHead>
            <TableHead>{dict.expenses.paidFrom}</TableHead>
            <TableHead className="text-right">{dict.common.amount}</TableHead>
            <TableHead>{dict.common.by}</TableHead>
            {isAdmin && <TableHead className="text-right">{dict.common.actions}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.date.toLocaleDateString("id-ID")}</TableCell>
              <TableCell>{e.description}</TableCell>
              <TableCell>
                <Badge variant="secondary">{dict.expenses.categories[e.category] ?? e.category}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{e.paidFrom}</TableCell>
              <TableCell className="text-right">{formatIDR(e.amount)}</TableCell>
              <TableCell className="text-muted-foreground">{e.createdBy}</TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <ConfirmDeleteButton
                    action={deleteJournalEntryAction.bind(null, e.id)}
                    description={`${dict.expenses.title}: ${e.description} — ${formatIDR(e.amount)}`}
                    size="xs"
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                {dict.expenses.noExpenses}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {expenses.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4}>{dict.common.total}</TableCell>
              <TableCell className="text-right">{formatIDR(total)}</TableCell>
              <TableCell colSpan={isAdmin ? 2 : 1} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
