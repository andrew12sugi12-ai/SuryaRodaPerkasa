import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import Link from "next/link";
import { getPurchase } from "@/server/services/purchases.service";
import { deletePurchaseAction } from "@/server/actions/admin.actions";
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

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.purchases.purchaseTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {purchase.date.toLocaleDateString("id-ID")} · {purchase.supplier.name}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/purchases/${purchase.id}/edit`} variant="outline" size="sm">
            {dict.common.edit}
          </LinkButton>
          <ConfirmDeleteButton
            action={deletePurchaseAction.bind(null, purchase.id)}
            description={`${dict.purchases.purchaseTitle}: ${purchase.supplier.name} — ${purchase.date.toLocaleDateString("id-ID")}`}
            redirectTo="/purchases"
          />
        </div>
      </div>

      {purchase.reference && (
        <p className="text-sm text-muted-foreground">{dict.common.reference}: {purchase.reference}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.purchases.product}</TableHead>
            <TableHead className="text-right">{dict.common.quantity}</TableHead>
            <TableHead className="text-right">{dict.products.unitCost}</TableHead>
            <TableHead className="text-right">{dict.purchases.lineTotal}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchase.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                {line.product.sku} — {line.product.name}
              </TableCell>
              <TableCell className="text-right">{Number(line.quantity)}</TableCell>
              <TableCell className="text-right">{formatIDR(line.unitCost)}</TableCell>
              <TableCell className="text-right">{formatIDR(line.lineTotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>{dict.common.total}</TableCell>
            <TableCell className="text-right">{formatIDR(purchase.totalAmount)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <p className="text-sm">
        {dict.purchases.paidVia} {purchase.paymentAccount.code} — {purchase.paymentAccount.name}
      </p>

      <p className="text-sm">
        <Link href={`/journal-entries/${purchase.journalEntry.id}`} className="underline">
          {dict.purchases.linkedToJournal}
        </Link>
      </p>
    </div>
  );
}
