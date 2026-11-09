import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { listSalesmen } from "@/server/services/salesmen.service";
import { deleteSalesmanAction } from "@/server/actions/salesmen.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SalesmenPage() {
  const dict = await getDict();
  const t = dict.salesmen;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const rows = await listSalesmen();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.nav.salesmen}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <LinkButton href="/salesmen/new">{t.newSalesman}</LinkButton>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.name}</TableHead>
              <TableHead>{dict.common.phone}</TableHead>
              <TableHead className="text-right">{t.tokoCount}</TableHead>
              <TableHead className="text-right">{t.monthlyTarget}</TableHead>
              <TableHead>{dict.common.status}</TableHead>
              <TableHead className="text-right">{dict.common.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{r._count.customers}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(r.monthlyTarget) > 0 ? (
                    formatIDR(Number(r.monthlyTarget))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.isActive ? (
                    <span className="text-green-600 dark:text-green-400">{dict.common.active}</span>
                  ) : (
                    <span className="text-muted-foreground">{dict.common.inactive}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <LinkButton href={`/salesmen/${r.id}/edit`} variant="ghost" size="sm">
                    {dict.common.edit}
                  </LinkButton>
                  {isAdmin && (
                    <ConfirmDeleteButton
                      action={deleteSalesmanAction.bind(null, r.id)}
                      description={r.name}
                      size="xs"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t.noSalesmen}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
