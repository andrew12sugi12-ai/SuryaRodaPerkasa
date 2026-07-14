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

export default async function ProductsPage() {
  const dict = await getDict();
  const products = await listProducts();

  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.quantityOnHand) * Number(p.unitCost),
    0
  );
  const totalUnits = products.reduce((sum, p) => sum + Number(p.quantityOnHand), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.products.title}</h1>
        <LinkButton href="/products/new">{dict.products.newProduct}</LinkButton>
      </div>

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
          {products.map((product) => {
            const stockValue = Number(product.quantityOnHand) * Number(product.unitCost);
            return (
              <TableRow key={product.id}>
                <TableCell className="font-mono">{product.sku}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell className="text-right">{Number(product.quantityOnHand)}</TableCell>
                <TableCell className="text-right">{formatIDR(product.unitCost)}</TableCell>
                <TableCell className="text-right">{formatIDR(stockValue)}</TableCell>
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
                  <LinkButton href={`/products/${product.id}/edit`} variant="ghost" size="sm">
                    {dict.common.edit}
                  </LinkButton>
                </TableCell>
              </TableRow>
            );
          })}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {dict.products.noProducts}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {products.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>{dict.common.total}</TableCell>
              <TableCell className="text-right">{totalUnits}</TableCell>
              <TableCell />
              <TableCell className="text-right">{formatIDR(totalStockValue)}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
