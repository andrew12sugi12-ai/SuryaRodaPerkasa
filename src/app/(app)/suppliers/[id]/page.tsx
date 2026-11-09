import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import Link from "next/link";
import { getSupplierDetail, getSupplierLedger } from "@/server/services/balances.service";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { KartuLedger } from "@/components/contacts/kartu-ledger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DuePill } from "@/components/shared/due-pill";
import { daysUntil } from "@/lib/due";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const { supplier, payable, purchases, payments, productSummary } =
    await getSupplierDetail(id);
  if (!supplier) notFound();
  const ledger = await getSupplierLedger(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[supplier.contactName, supplier.phone, supplier.email]
              .filter(Boolean)
              .join(" · ") || dict.common.noContactInfo}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton
            href={`/payments/new?type=SUPPLIER_PAYMENT&supplierId=${supplier.id}`}
            variant="outline"
          >
            {dict.payments.recordPayment}
          </LinkButton>
          <LinkButton href={`/suppliers/${supplier.id}/edit`} variant="outline">
            {dict.common.edit}
          </LinkButton>
        </div>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {dict.contacts.outstandingPayable}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{formatIDR(payable)}</CardContent>
      </Card>

      <KartuLedger
        title={dict.contacts.kartuHutang}
        subtitle={`${dict.reports.companyName} · ${supplier.name}`}
        entries={ledger.entries}
        balance={ledger.balance}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.contacts.productsSupplied}</h2>
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
        <h2 className="text-lg font-medium">{dict.contacts.purchaseHistory}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.date}</TableHead>
              <TableHead>{dict.contacts.dueColumn}</TableHead>
              <TableHead>{dict.common.reference}</TableHead>
              <TableHead>{dict.contacts.billedTo}</TableHead>
              <TableHead className="text-right">{dict.common.total}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/purchases/${p.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {p.date.toLocaleDateString("id-ID")}
                  </Link>
                </TableCell>
                <TableCell>
                  {p.dueDate ? (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{p.dueDate.toLocaleDateString("id-ID")}</span>
                      {payable > 0 && <DuePill days={daysUntil(p.dueDate)} />}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{p.reference || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.paymentAccount.code} — {p.paymentAccount.name}
                </TableCell>
                <TableCell className="text-right">{formatIDR(p.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {purchases.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {dict.contacts.noPurchasesYet}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{dict.contacts.paymentsMade}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.common.date}</TableHead>
              <TableHead>{dict.common.reference}</TableHead>
              <TableHead>{dict.contacts.fromAccount}</TableHead>
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
