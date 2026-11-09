import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getSale } from "@/server/services/sales.service";
import { getReturnedQtyByProduct } from "@/server/services/sales-return.service";
import { SalesReturnForm } from "@/components/returns/sales-return-form";

export default async function SaleReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  const returnedByProduct = await getReturnedQtyByProduct(sale.id);

  const lines = sale.lines.map((l) => ({
    saleLineId: l.id,
    sku: l.product.sku,
    name: l.product.name,
    sold: Number(l.quantity),
    alreadyReturned: returnedByProduct.get(l.productId) ?? 0,
    unitPrice: Number(l.unitPrice),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.returns.returnTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {dict.returns.againstSale}: {sale.customer.name} · {sale.date.toLocaleDateString("id-ID")}
          {sale.reference ? ` · ${sale.reference}` : ""}
        </p>
      </div>
      <SalesReturnForm saleId={sale.id} lines={lines} />
    </div>
  );
}
