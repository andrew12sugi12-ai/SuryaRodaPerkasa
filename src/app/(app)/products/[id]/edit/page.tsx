import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getProduct, listComponentCandidates } from "@/server/services/products.service";
import { ProductForm } from "@/components/products/product-form";
import { DeleteProductDialog } from "@/components/products/delete-product-dialog";
import { formatIDR } from "@/lib/currency";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const candidates = await listComponentCandidates(product.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.products.editProduct}</h1>
      <p className="text-sm text-muted-foreground">
        {dict.products.currentStock
          .replace("{qty}", String(Number(product.quantityOnHand)))
          .replace("{cost}", formatIDR(product.unitCost))}
      </p>
      <ProductForm
        productId={product.id}
        componentOptions={candidates.map((c) => ({ id: c.id, label: `${c.sku} — ${c.name}` }))}
        defaultValues={{
          sku: product.sku,
          name: product.name,
          description: product.description ?? "",
          category: product.category,
          unitPrice: Number(product.unitPrice),
          isActive: product.isActive,
          components: product.components.map((pc) => ({
            componentId: pc.componentId,
            quantity: Number(pc.quantity),
          })),
        }}
      />
      <DeleteProductDialog productId={product.id} sku={product.sku} />
    </div>
  );
}
