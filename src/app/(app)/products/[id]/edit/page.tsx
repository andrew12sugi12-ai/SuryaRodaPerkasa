import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getProduct } from "@/server/services/products.service";
import { ProductForm } from "@/components/products/product-form";
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
        defaultValues={{
          sku: product.sku,
          name: product.name,
          description: product.description ?? "",
          unitPrice: Number(product.unitPrice),
          isActive: product.isActive,
        }}
      />
    </div>
  );
}
