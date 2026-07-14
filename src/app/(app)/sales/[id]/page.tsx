import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import Link from "next/link";
import { getSale } from "@/server/services/sales.service";
import { deleteSaleAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { LinkButton } from "@/components/ui/link-button";
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

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.sales.saleTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {sale.date.toLocaleDateString("id-ID")} · {sale.customer.name}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/sales/${sale.id}/edit`} variant="outline" size="sm">
            {dict.common.edit}
          </LinkButton>
          <ConfirmDeleteButton
            action={deleteSaleAction.bind(null, sale.id)}
            description={`${dict.sales.saleTitle}: ${sale.customer.name} — ${sale.date.toLocaleDateString("id-ID")}`}
            redirectTo="/sales"
          />
        </div>
      </div>

      {sale.reference && (
        <p className="text-sm text-muted-foreground">{dict.common.reference}: {sale.reference}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.purchases.product}</TableHead>
            <TableHead className="text-right">{dict.common.quantity}</TableHead>
            <TableHead className="text-right">{dict.sales.unitPrice}</TableHead>
            <TableHead className="text-right">{dict.purchases.lineTotal}</TableHead>
            <TableHead className="text-right">{dict.sales.lineCogs}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sale.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                {line.product.sku} — {line.product.name}
              </TableCell>
              <TableCell className="text-right">{Number(line.quantity)}</TableCell>
              <TableCell className="text-right">{formatIDR(line.unitPrice)}</TableCell>
              <TableCell className="text-right">{formatIDR(line.lineTotal)}</TableCell>
              <TableCell className="text-right">{formatIDR(line.lineCOGS)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>{dict.common.total}</TableCell>
            <TableCell className="text-right">{formatIDR(sale.totalAmount)}</TableCell>
            <TableCell className="text-right">{formatIDR(sale.totalCOGS)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <p className="text-sm">
        {dict.sales.receivedVia} {sale.paymentAccount.code} — {sale.paymentAccount.name}
      </p>

      <div className="flex gap-4 text-sm">
        <Link href={`/journal-entries/${sale.revenueJournalEntry.id}`} className="underline">
          {dict.sales.revenueJournalEntry}
        </Link>
        <Link href={`/journal-entries/${sale.cogsJournalEntry.id}`} className="underline">
          {dict.sales.cogsJournalEntry}
        </Link>
      </div>
    </div>
  );
}
