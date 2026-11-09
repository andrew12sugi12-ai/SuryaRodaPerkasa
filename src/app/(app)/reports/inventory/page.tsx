import { listProducts } from "@/server/services/products.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
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

export default async function InventoryReportPage() {
  const dict = await getDict();
  const products = await listProducts();

  const rows = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    quantity: Number(p.quantityOnHand),
    unitCost: Number(p.unitCost),
    stockValue: Number(p.quantityOnHand) * Number(p.unitCost),
  }));

  const totalUnits = rows.reduce((sum, r) => sum + r.quantity, 0);
  const totalStockValue = rows.reduce((sum, r) => sum + r.stockValue, 0);
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.reports.inventoryTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.reports.companyName} · {dict.reports.asOf} {today}
          </p>
        </div>
        <PrintButton />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.products.sku}</TableHead>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead className="text-right">{dict.common.quantity}</TableHead>
            <TableHead className="text-right">{dict.products.unitCost}</TableHead>
            <TableHead className="text-right">{dict.products.stockValue}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.sku}>
              <TableCell className="font-mono">{r.sku}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell className="text-right">{r.quantity}</TableCell>
              <TableCell className="text-right">{formatIDR(r.unitCost)}</TableCell>
              <TableCell className="text-right">{formatIDR(r.stockValue)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {dict.products.noProducts}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.common.total}</TableCell>
              <TableCell className="text-right">{totalUnits}</TableCell>
              <TableCell />
              <TableCell className="text-right">{formatIDR(totalStockValue)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
