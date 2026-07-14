import { ProductForm } from "@/components/products/product-form";
import { getDict } from "@/lib/i18n/server";

export default async function NewProductPage() {
  const dict = await getDict();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.products.newProduct}</h1>
      <ProductForm />
    </div>
  );
}
