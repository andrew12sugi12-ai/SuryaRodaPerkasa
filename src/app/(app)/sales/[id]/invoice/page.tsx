import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getSale } from "@/server/services/sales.service";
import { formatIDR } from "@/lib/currency";
import { terbilangRupiah } from "@/lib/terbilang";
import { PrintButton } from "@/components/reports/print-button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SaleInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  const total = Number(sale.totalAmount);
  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sans">{dict.reports.companyName}</h1>
          <p className="text-sm text-muted-foreground">{dict.reports.companyAddress}</p>
        </div>
        <PrintButton />
      </div>

      <div className="flex items-start justify-between border-y py-3">
        <div>
          <p className="text-lg font-semibold">{dict.reports.invoiceTitle}</p>
          <p className="text-sm">
            {dict.reports.invoiceNo}: {sale.reference || sale.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="text-right text-sm">
          <p>
            {dict.common.date}: {fmtDate(sale.date)}
          </p>
          {sale.dueDate && (
            <p>
              {dict.contacts.dueDate}: {fmtDate(sale.dueDate)}
            </p>
          )}
        </div>
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground">{dict.contacts.billedTo}:</p>
        <p className="font-medium">{sale.customer.name}</p>
        {sale.customer.address && <p>{sale.customer.address}</p>}
        {sale.customer.phone && <p>{sale.customer.phone}</p>}
      </div>

      <Table className="border [&_td]:border [&_th]:border">
        <TableHeader>
          <TableRow>
            <TableHead className="border">{dict.products.sku}</TableHead>
            <TableHead className="border">{dict.purchases.product}</TableHead>
            <TableHead className="border text-right">{dict.common.quantity}</TableHead>
            <TableHead className="border text-right">{dict.sales.unitPrice}</TableHead>
            <TableHead className="border text-right">{dict.purchases.lineTotal}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sale.lines.map((l) => (
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
            <TableCell className="text-right font-semibold">{formatIDR(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <span className="text-muted-foreground">{dict.reports.terbilang}: </span>
        <span className="font-medium italic">{terbilangRupiah(total)}</span>
      </div>

      <p className="text-xs text-muted-foreground">{dict.reports.companyBankNote}</p>

      <div className="grid grid-cols-2 gap-8 pt-8 text-center text-sm">
        <div>
          <p className="mb-16 text-muted-foreground">Hormat kami,</p>
          <p className="border-t pt-1">{dict.reports.companyName}</p>
        </div>
        <div>
          <p className="mb-16 text-muted-foreground">Penerima,</p>
          <p className="border-t pt-1">{sale.customer.name}</p>
        </div>
      </div>
    </div>
  );
}
