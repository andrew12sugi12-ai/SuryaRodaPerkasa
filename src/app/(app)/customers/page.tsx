import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { listCustomersWithReceivables } from "@/server/services/balances.service";
import { deleteCustomerAction } from "@/server/actions/admin.actions";
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

export default async function CustomersPage() {
  const dict = await getDict();
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const customers = await listCustomersWithReceivables();
  const totalReceivable = customers.reduce((sum, c) => sum + c.receivable, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.nav.customers}</h1>
        <LinkButton href="/customers/new">{dict.contacts.newCustomer}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead>{dict.common.phone}</TableHead>
            <TableHead className="text-right">{dict.contacts.receivable}</TableHead>
            <TableHead>{dict.common.status}</TableHead>
            <TableHead className="text-right">{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link
                  href={`/customers/${customer.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {customer.name}
                </Link>
              </TableCell>
              <TableCell>{customer.phone || "—"}</TableCell>
              <TableCell className="text-right">
                {customer.receivable !== 0 ? (
                  formatIDR(customer.receivable)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={customer.isActive ? "default" : "secondary"}>
                  {customer.isActive ? dict.common.active : dict.common.inactive}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <LinkButton href={`/customers/${customer.id}`} variant="ghost" size="sm">
                  {dict.common.view}
                </LinkButton>
                <LinkButton href={`/customers/${customer.id}/edit`} variant="ghost" size="sm">
                  {dict.common.edit}
                </LinkButton>
                {isAdmin && (
                  <ConfirmDeleteButton
                    action={deleteCustomerAction.bind(null, customer.id)}
                    description={customer.name}
                    size="xs"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
          {customers.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {dict.contacts.noCustomers}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {customers.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.contacts.totalReceivables}</TableCell>
              <TableCell className="text-right">{formatIDR(totalReceivable)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
