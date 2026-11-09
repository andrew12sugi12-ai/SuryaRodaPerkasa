import { listProducts } from "@/server/services/products.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { AdjustStockDialog } from "@/components/products/adjust-stock-dialog";
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

const CATEGORY_ORDER = ["BICYCLE", "SPAREPART"] as const;

export default async function ProductsPage() {
  const dict = await getDict();
  const products = await listProducts();

  const categoryLabel: Record<string, string> = {
    BICYCLE: dict.products.bicycle,
    SPAREPART: dict.products.sparepart,
  };

  const groups = CATEGORY_ORDER.map((category) => {
    const items = products.filter((p) => p.category === category);
    const units = items.reduce((sum, p) => sum + Number(p.quantityOnHand), 0);
    const value = items.reduce(
      (sum, p) => sum + Number(p.quantityOnHand) * Number(p.unitCost),
      0
    );
    return { category, items, units, value };
  }).filter((g) => g.items.length > 0);

  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.quantityOnHand) * Number(p.unitCost),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.products.title}</h1>
        <div className="flex gap-2">
          <LinkButton href="/reports/inventory" variant="outline">
            {dict.reports.downloadPdf}
          </LinkButton>
          <LinkButton href="/products/new">{dict.products.newProduct}</LinkButton>
        </div>
      </div>

      {/* Per-category summary */}
      {groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.category} className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {categoryLabel[g.category]}
              </p>
              <p className="mt-1 text-2xl font-semibold">{formatIDR(g.value)}</p>
              <p className="text-xs text-muted-foreground">
                {g.units} {dict.common.quantity.toLowerCase()} · {g.items.length} SKU
              </p>
            </div>
          ))}
          <div className="rounded-lg border bg-primary/5 p-4">
            <p className="text-sm font-medium text-muted-foreground">{dict.common.total}</p>
            <p className="mt-1 text-2xl font-semibold">{formatIDR(totalStockValue)}</p>
          </div>
        </div>
      )}

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
                <TableHead>{dict.common.status}</TableHead>
                <TableHead className="text-right">{dict.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {g.items.map((product) => {
                const isBike = product.components.length > 0;
                // A bike has no stock of its own — show how many can be built
                // from its parts, and its cost = sum of component costs.
                const bikeCost = product.components.reduce(
                  (sum, c) => sum + Number(c.quantity) * Number(c.component.unitCost),
                  0
                );
                const buildable = isBike
                  ? Math.floor(
                      Math.min(
                        ...product.components.map((c) =>
                          Number(c.quantity) > 0
                            ? Number(c.component.quantityOnHand) / Number(c.quantity)
                            : 0
                        )
                      )
                    )
                  : Number(product.quantityOnHand);
                const unitCost = isBike ? bikeCost : Number(product.unitCost);
                const stockValue = isBike
                  ? 0
                  : Number(product.quantityOnHand) * Number(product.unitCost);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>
                      {product.name}
                      {isBike && (
                        <Badge variant="outline" className="ml-2 align-middle">
                          {dict.products.bicycle}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {buildable}
                      {isBike && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {dict.products.buildable}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatIDR(unitCost)}</TableCell>
                    <TableCell className="text-right">
                      {isBike ? "—" : formatIDR(stockValue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? dict.common.active : dict.common.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AdjustStockDialog
                        productId={product.id}
                        productLabel={`${product.sku} — ${product.name}`}
                        currentQuantity={Number(product.quantityOnHand)}
                      />
                      <LinkButton
                        href={`/products/${product.id}/edit`}
                        variant="ghost"
                        size="sm"
                      >
                        {dict.common.edit}
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>{dict.common.total}</TableCell>
                <TableCell className="text-right">{g.units}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatIDR(g.value)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      ))}

      {products.length === 0 && (
        <p className="text-center text-muted-foreground">{dict.products.noProducts}</p>
      )}
    </div>
  );
}
