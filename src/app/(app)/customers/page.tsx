import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { listCustomerAging } from "@/server/services/balances.service";
import { deleteCustomerAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Amt({ value, danger }: { value: number; danger?: boolean }) {
  if (value <= 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`tabular-nums ${danger ? "text-red-600 dark:text-red-400" : ""}`}>
      {formatIDR(value)}
    </span>
  );
}

export default async function CustomersPage() {
  const dict = await getDict();
  const t = dict.contacts;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const rows = await listCustomerAging();

  const sum = (k: "b0_30" | "b31_60" | "b61_90" | "b90" | "total") =>
    rows.reduce((s, r) => s + r[k], 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.nav.customers}</h1>
          <p className="text-sm text-muted-foreground">{t.agingTitle}</p>
        </div>
        <LinkButton href="/customers/new">{t.newCustomer}</LinkButton>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.name}</TableHead>
              <TableHead className="text-right">{t.b0_30}</TableHead>
              <TableHead className="text-right">{t.b31_60}</TableHead>
              <TableHead className="text-right">{t.b61_90}</TableHead>
              <TableHead className="text-right">{t.b90}</TableHead>
              <TableHead className="text-right">{t.totalDue}</TableHead>
              <TableHead className="text-right">{dict.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/customers/${r.id}`} className="font-medium underline-offset-2 hover:underline">
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right"><Amt value={r.b0_30} /></TableCell>
                <TableCell className="text-right"><Amt value={r.b31_60} /></TableCell>
                <TableCell className="text-right"><Amt value={r.b61_90} danger /></TableCell>
                <TableCell className="text-right"><Amt value={r.b90} danger /></TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {r.total > 0 ? formatIDR(r.total) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <LinkButton href={`/customers/${r.id}`} variant="ghost" size="sm">
                    {dict.common.view}
                  </LinkButton>
                  <LinkButton href={`/customers/${r.id}/edit`} variant="ghost" size="sm">
                    {dict.common.edit}
                  </LinkButton>
                  {isAdmin && (
                    <ConfirmDeleteButton action={deleteCustomerAction.bind(null, r.id)} description={r.name} size="xs" />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t.noCustomers}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>{dict.common.total}</TableCell>
                <TableCell className="text-right tabular-nums">{formatIDR(sum("b0_30"))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatIDR(sum("b31_60"))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatIDR(sum("b61_90"))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatIDR(sum("b90"))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatIDR(sum("total"))}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
