import { formatIDR } from "@/lib/currency";
import { PrintButton } from "@/components/reports/print-button";
import { isAssembledBike } from "@/lib/inventory-scope";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportProduct = {
  id: string;
  sku: string;
  name: string;
  quantityOnHand: unknown;
  unitCost: unknown;
  components: { quantity: unknown; component: { quantityOnHand: unknown; unitCost: unknown } }[];
};

type Dict = {
  reports: { companyName: string; asOf: string };
  products: { sku: string; unitCost: string; stockValue: string; noProducts: string; buildable: string };
  common: { name: string; quantity: string; total: string };
};

/**
 * A single inventory valuation report (used for both the Bicycle and the
 * Sparepart report). Stock-carrying items are valued; assembled bikes carry no
 * stock of their own, so they are listed separately as "how many can be built".
 */
export function InventoryReport({
  title,
  products,
  dict,
}: {
  title: string;
  products: ReportProduct[];
  dict: Dict;
}) {
  // Items that hold their own stock (spareparts, bike components).
  const stockItems = products.filter((p) => !isAssembledBike(p));
  // Assembled bikes — no own stock, shown as buildable only.
  const bikeItems = products.filter((p) => isAssembledBike(p));

  const stockRows = stockItems.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    quantity: Number(p.quantityOnHand),
    unitCost: Number(p.unitCost),
    stockValue: Number(p.quantityOnHand) * Number(p.unitCost),
  }));
  const totalUnits = stockRows.reduce((s, r) => s + r.quantity, 0);
  const totalValue = stockRows.reduce((s, r) => s + r.stockValue, 0);

  const bikeRows = bikeItems.map((p) => {
    const unitCost = p.components.reduce(
      (s, c) => s + Number(c.quantity) * Number(c.component.unitCost),
      0
    );
    const buildable = p.components.length
      ? Math.floor(
          Math.min(
            ...p.components.map((c) =>
              Number(c.quantity) > 0
                ? Number(c.component.quantityOnHand) / Number(c.quantity)
                : 0
            )
          )
        )
      : 0;
    return { id: p.id, sku: p.sku, name: p.name, unitCost, buildable };
  });

  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
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
          {stockRows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono">{r.sku}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell className="text-right">{r.quantity}</TableCell>
              <TableCell className="text-right">{formatIDR(r.unitCost)}</TableCell>
              <TableCell className="text-right">{formatIDR(r.stockValue)}</TableCell>
            </TableRow>
          ))}
          {stockRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {dict.products.noProducts}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {stockRows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.common.total}</TableCell>
              <TableCell className="text-right">{totalUnits}</TableCell>
              <TableCell />
              <TableCell className="text-right">{formatIDR(totalValue)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {bikeRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Sepeda rakitan</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.products.sku}</TableHead>
                <TableHead>{dict.common.name}</TableHead>
                <TableHead className="text-right">{dict.products.buildable}</TableHead>
                <TableHead className="text-right">{dict.products.unitCost}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bikeRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.sku}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.buildable}</TableCell>
                  <TableCell className="text-right">{formatIDR(r.unitCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
