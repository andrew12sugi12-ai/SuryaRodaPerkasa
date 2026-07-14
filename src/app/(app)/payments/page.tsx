import { listPayments } from "@/server/services/payments.service";
import { auth } from "@/auth";
import { deletePaymentAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PaymentsPage() {
  const dict = await getDict();
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const payments = await listPayments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.payments.title}</h1>
        <LinkButton href="/payments/new">{dict.payments.newPayment}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{dict.common.type}</TableHead>
            <TableHead>{dict.payments.party}</TableHead>
            <TableHead>{dict.common.account}</TableHead>
            <TableHead>{dict.common.reference}</TableHead>
            <TableHead className="text-right">{dict.common.amount}</TableHead>
            {isAdmin && <TableHead className="text-right">{dict.common.actions}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.date.toLocaleDateString("id-ID")}</TableCell>
              <TableCell>
                <Badge variant={p.type === "CUSTOMER_RECEIPT" ? "default" : "secondary"}>
                  {p.type === "CUSTOMER_RECEIPT" ? dict.payments.received : dict.payments.paidOut}
                </Badge>
              </TableCell>
              <TableCell>{p.customer?.name ?? p.supplier?.name ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {p.account.code} — {p.account.name}
              </TableCell>
              <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
              <TableCell className="text-right">{formatIDR(p.amount)}</TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <ConfirmDeleteButton
                    action={deletePaymentAction.bind(null, p.id)}
                    description={`${dict.payments.title}: ${p.customer?.name ?? p.supplier?.name ?? ""} — ${formatIDR(p.amount)}`}
                    size="xs"
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                {dict.payments.noPayments}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
