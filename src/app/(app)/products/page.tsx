import { Fragment } from "react";
import { listProducts } from "@/server/services/products.service";
import { getDict } from "@/lib/i18n/server";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import { AdjustStockDialog } from "@/components/products/adjust-stock-dialog";
import { Badge } from "@/components/ui/badge";
import { isAssembledBike, isSparepartItem } from "@/lib/inventory-scope";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage() {
  const dict = await getDict();
  const products = await listProducts();

  // Assembled bikes (hold no own stock) and the parts they are built from.
  const bikes = products.filter(isAssembledBike);
  // A product is a bike component when it is used in at least one bike.
  const isComponent = (p: (typeof products)[number]) => (p.usedInBikes?.length ?? 0) > 0;
  const bikeComponents = products.filter(isComponent);
  // True spareparts: not a bike and not a bike component.
  const spareparts = products.filter(isSparepartItem);
  // Bicycle items tagged Sepeda that are neither a bike nor a component.
  const bicycleStandalone = products.filter(
    (p) => p.category === "BICYCLE" && !isAssembledBike(p) && !isComponent(p)
  );

  // Sepeda (bicycle) capital lives in the parts — bikes themselves carry none.
  const sepedaStockItems = [...bikeComponents, ...bicycleStandalone];
  const sepedaUnits = sepedaStockItems.reduce((s, p) => s + Number(p.quantityOnHand), 0);
  const sepedaValue = sepedaStockItems.reduce(
    (s, p) => s + Number(p.quantityOnHand) * Number(p.unitCost),
    0
  );
  const sepedaSkuCount = bikes.length + bicycleStandalone.length;

  const sparepartUnits = spareparts.reduce((s, p) => s + Number(p.quantityOnHand), 0);
  const sparepartValue = spareparts.reduce(
    (s, p) => s + Number(p.quantityOnHand) * Number(p.unitCost),
    0
  );

  const totalStockValue = sepedaValue + sparepartValue;

  const bikeUnitCost = (p: (typeof products)[number]) =>
    p.components.reduce((s, c) => s + Number(c.quantity) * Number(c.component.unitCost), 0);
  const bikeBuildable = (p: (typeof products)[number]) =>
    p.components.length
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

  const hasSepeda = bikes.length > 0 || bicycleStandalone.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.products.title}</h1>
        <div className="flex gap-2">
          <LinkButton href="/reports/inventory/sparepart" variant="outline">
            {dict.reports.downloadPdf}
          </LinkButton>
          <LinkButton href="/products/new">{dict.products.newProduct}</LinkButton>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">{dict.products.bicycle}</p>
          <p className="mt-1 text-2xl font-semibold">{formatIDR(sepedaValue)}</p>
          <p className="text-xs text-muted-foreground">
            {sepedaUnits} {dict.common.quantity.toLowerCase()} · {sepedaSkuCount} SKU
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium text-muted-foreground">{dict.products.sparepart}</p>
          <p className="mt-1 text-2xl font-semibold">{formatIDR(sparepartValue)}</p>
          <p className="text-xs text-muted-foreground">
            {sparepartUnits} {dict.common.quantity.toLowerCase()} · {spareparts.length} SKU
          </p>
        </div>
        <div className="rounded-lg border bg-primary/5 p-4">
          <p className="text-sm font-medium text-muted-foreground">{dict.common.total}</p>
          <p className="mt-1 text-2xl font-semibold">{formatIDR(totalStockValue)}</p>
        </div>
      </div>

      {/* Sepeda: each bike, with its parts nested underneath it */}
      {hasSepeda && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{dict.products.bicycle}</h2>
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
              {bikes.map((bike) => (
                <Fragment key={bike.id}>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-mono">{bike.sku}</TableCell>
                    <TableCell>
                      {bike.name}
                      <Badge variant="outline" className="ml-2 align-middle">
                        {dict.products.bicycle}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {bikeBuildable(bike)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {dict.products.buildable}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatIDR(bikeUnitCost(bike))}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell>
                      <Badge variant={bike.isActive ? "default" : "secondary"}>
                        {bike.isActive ? dict.common.active : dict.common.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <LinkButton href={`/products/${bike.id}/edit`} variant="ghost" size="sm">
                        {dict.common.edit}
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                  {bike.components.map((c) => {
                    const part = c.component;
                    const qty = Number(part.quantityOnHand);
                    const cost = Number(part.unitCost);
                    return (
                      <TableRow key={`${bike.id}-${part.id}`}>
                        <TableCell className="font-mono text-muted-foreground">{part.sku}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="mr-1">↳</span>
                          {part.name}
                          <span className="ml-2 text-xs">× {Number(c.quantity)}</span>
                        </TableCell>
                        <TableCell className="text-right">{qty}</TableCell>
                        <TableCell className="text-right">{formatIDR(cost)}</TableCell>
                        <TableCell className="text-right">{formatIDR(qty * cost)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <AdjustStockDialog
                            productId={part.id}
                            productLabel={`${part.sku} — ${part.name}`}
                            currentQuantity={qty}
                          />
                          <LinkButton href={`/products/${part.id}/edit`} variant="ghost" size="sm">
                            {dict.common.edit}
                          </LinkButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
              {bicycleStandalone.map((product) => {
                const qty = Number(product.quantityOnHand);
                const cost = Number(product.unitCost);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right">{qty}</TableCell>
                    <TableCell className="text-right">{formatIDR(cost)}</TableCell>
                    <TableCell className="text-right">{formatIDR(qty * cost)}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? dict.common.active : dict.common.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AdjustStockDialog
                        productId={product.id}
                        productLabel={`${product.sku} — ${product.name}`}
                        currentQuantity={qty}
                      />
                      <LinkButton href={`/products/${product.id}/edit`} variant="ghost" size="sm">
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
                <TableCell className="text-right">{sepedaUnits}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatIDR(sepedaValue)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      )}

      {/* Sparepart: true spareparts only — never bike components */}
      {spareparts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{dict.products.sparepart}</h2>
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
              {spareparts.map((product) => {
                const qty = Number(product.quantityOnHand);
                const cost = Number(product.unitCost);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right">{qty}</TableCell>
                    <TableCell className="text-right">{formatIDR(cost)}</TableCell>
                    <TableCell className="text-right">{formatIDR(qty * cost)}</TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? dict.common.active : dict.common.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AdjustStockDialog
                        productId={product.id}
                        productLabel={`${product.sku} — ${product.name}`}
                        currentQuantity={qty}
                      />
                      <LinkButton href={`/products/${product.id}/edit`} variant="ghost" size="sm">
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
                <TableCell className="text-right">{sparepartUnits}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatIDR(sparepartValue)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </section>
      )}

      {products.length === 0 && (
        <p className="text-center text-muted-foreground">{dict.products.noProducts}</p>
      )}
    </div>
  );
}
