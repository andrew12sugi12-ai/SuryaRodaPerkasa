import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import Link from "next/link";
import { getCustomerDetail } from "@/server/services/balances.service";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const { customer, receivable, sales, payments, productSummary } =
    await getCustomerDetail(id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[customer.contactName, customer.phone, customer.email]
              .filter(Boolean)
              .join(" · ") || dict.common.noContactInfo}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton
            href={`/payments/new?type=CUSTOMER_RECEIPT&customerId=${customer.id}`}
            variant="outline"
          >
            {dict.payments.recordPayment}
          </LinkButton>
          <LinkButton href={`/customers/${customer.id}/edit`} variant="outline">
            {dict.common.edit}
          </LinkButton>
        </div>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {dict.contacts.outstandingReceivable}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{formatIDR(receivable)}</CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.contacts.productsPurchased}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.products.sku}</TableHead>
              <TableHead>{dict.purchases.product}</TableHead>
              <TableHead className="text-right">{dict.contacts.totalQty}</TableHead>
              <TableHead className="text-right">{dict.contacts.totalValue}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productSummary.map((p) => (
              <TableRow key={p.sku}>
                <TableCell className="font-mono">{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell className="text-right">{p.quantity}</TableCell>
                <TableCell className="text-right">{formatIDR(p.total)}</TableCell>
              </TableRow>
            ))}
            {productSummary.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {dict.contacts.noPurchasesYet}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.contacts.salesHistory}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.date}</TableHead>
              <TableHead>{dict.common.reference}</TableHead>
              <TableHead>{dict.contacts.billedTo}</TableHead>
              <TableHead className="text-right">{dict.common.total}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/sales/${s.id}`} className="underline-offset-2 hover:underline">
                    {s.date.toLocaleDateString("id-ID")}
                  </Link>
                </TableCell>
                <TableCell>{s.reference || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.paymentAccount.code} — {s.paymentAccount.name}
                </TableCell>
                <TableCell className="text-right">{formatIDR(s.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {dict.contacts.noSalesYet}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.contacts.paymentsReceived}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.date}</TableHead>
              <TableHead>{dict.common.reference}</TableHead>
              <TableHead>{dict.contacts.intoAccount}</TableHead>
              <TableHead className="text-right">{dict.common.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.date.toLocaleDateString("id-ID")}</TableCell>
                <TableCell>{p.reference || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.account.code} — {p.account.name}
                </TableCell>
                <TableCell className="text-right">{formatIDR(p.amount)}</TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {dict.contacts.noPaymentsYet}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
