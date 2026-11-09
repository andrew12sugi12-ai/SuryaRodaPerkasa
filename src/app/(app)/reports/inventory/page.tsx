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

const CATEGORY_ORDER = ["BICYCLE", "SPAREPART"] as const;

export default async function InventoryReportPage() {
  const dict = await getDict();
  const products = await listProducts();

  const categoryLabel: Record<string, string> = {
    BICYCLE: dict.products.bicycle,
    SPAREPART: dict.products.sparepart,
  };

  // Bikes hold no stock of their own (their value lives in the components), so
  // an inventory valuation only lists stock-carrying products.
  const stockProducts = products.filter((p) => p.components.length === 0);

  const groups = CATEGORY_ORDER.map((category) => {
    const items = stockProducts
      .filter((p) => p.category === category)
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        quantity: Number(p.quantityOnHand),
        unitCost: Number(p.unitCost),
        stockValue: Number(p.quantityOnHand) * Number(p.unitCost),
      }));
    const units = items.reduce((sum, r) => sum + r.quantity, 0);
    const value = items.reduce((sum, r) => sum + r.stockValue, 0);
    return { category, items, units, value };
  }).filter((g) => g.items.length > 0);

  const totalUnits = stockProducts.reduce((sum, p) => sum + Number(p.quantityOnHand), 0);
  const totalStockValue = stockProducts.reduce(
    (sum, p) => sum + Number(p.quantityOnHand) * Number(p.unitCost),
    0
  );

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

      {groups.map((g) => (
        <section key={g.category} className="space-y-3">
          <h2 className="text-lg font-medium">{categoryLabel[g.category]}</h2>
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
              {g.items.map((r) => (
                <TableRow key={r.sku}>
                  <TableCell className="font-mono">{r.sku}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className="text-right">{formatIDR(r.unitCost)}</TableCell>
                  <TableCell className="text-right">{formatIDR(r.stockValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{dict.common.total}</TableCell>
                <TableCell className="text-right">{g.units}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatIDR(g.value)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      ))}

      {products.length === 0 && (
        <p className="text-center text-muted-foreground">{dict.products.noProducts}</p>
      )}

      {groups.length > 1 && (
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">
                {dict.common.total}
              </TableCell>
              <TableCell className="text-right font-semibold">{totalUnits}</TableCell>
              <TableCell />
              <TableCell className="text-right font-semibold">
                {formatIDR(totalStockValue)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </div>
  );
}
