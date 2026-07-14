import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { listSuppliersWithPayables } from "@/server/services/balances.service";
import { deleteSupplierAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SuppliersPage() {
  const dict = await getDict();
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const suppliers = await listSuppliersWithPayables();
  const totalPayable = suppliers.reduce((sum, s) => sum + s.payable, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.nav.suppliers}</h1>
        <LinkButton href="/suppliers/new">{dict.contacts.newSupplier}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead>{dict.common.phone}</TableHead>
            <TableHead className="text-right">{dict.contacts.payable}</TableHead>
            <TableHead>{dict.common.status}</TableHead>
            <TableHead className="text-right">{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell>
                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {supplier.name}
                </Link>
              </TableCell>
              <TableCell>{supplier.phone || "—"}</TableCell>
              <TableCell className="text-right">
                {supplier.payable !== 0 ? (
                  formatIDR(supplier.payable)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={supplier.isActive ? "default" : "secondary"}>
                  {supplier.isActive ? dict.common.active : dict.common.inactive}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <LinkButton href={`/suppliers/${supplier.id}`} variant="ghost" size="sm">
                  {dict.common.view}
                </LinkButton>
                <LinkButton href={`/suppliers/${supplier.id}/edit`} variant="ghost" size="sm">
                  {dict.common.edit}
                </LinkButton>
                {isAdmin && (
                  <ConfirmDeleteButton
                    action={deleteSupplierAction.bind(null, supplier.id)}
                    description={supplier.name}
                    size="xs"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
          {suppliers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {dict.contacts.noSuppliers}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {suppliers.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.contacts.totalPayables}</TableCell>
              <TableCell className="text-right">{formatIDR(totalPayable)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
