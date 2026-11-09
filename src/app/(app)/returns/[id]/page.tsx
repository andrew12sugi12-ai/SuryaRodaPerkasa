import { notFound } from "next/navigation";
import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { getSalesReturn } from "@/server/services/sales-return.service";
import { formatIDR } from "@/lib/currency";
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

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const t = dict.returns;
  const { id } = await params;
  const ret = await getSalesReturn(id);
  if (!ret) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.returnTitle}: {ret.number || ret.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ret.date.toLocaleDateString("id-ID")} · {ret.customer.name} ·{" "}
            <Link href={`/sales/${ret.saleId}`} className="hover:underline">
              {dict.returns.againstSale}
            </Link>
          </p>
        </div>
        <Badge variant={ret.restock ? "default" : "secondary"}>
          {ret.restock ? t.restock : "Afkir"}
        </Badge>
      </div>

      {ret.reason && (
        <p className="text-sm text-muted-foreground">
          {t.reason}: {ret.reason}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.products.sku}</TableHead>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead className="text-right">{dict.common.quantity}</TableHead>
            <TableHead className="text-right">{dict.sales.unitPrice}</TableHead>
            <TableHead className="text-right">{dict.purchases.lineTotal}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ret.lines.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-mono">{l.product.sku}</TableCell>
              <TableCell>{l.product.name}</TableCell>
              <TableCell className="text-right">{Number(l.quantity)}</TableCell>
              <TableCell className="text-right">{formatIDR(l.unitPrice)}</TableCell>
              <TableCell className="text-right">{formatIDR(l.lineTotal)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-medium">
              {dict.common.total}
            </TableCell>
            <TableCell className="text-right font-semibold">{formatIDR(ret.totalAmount)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
