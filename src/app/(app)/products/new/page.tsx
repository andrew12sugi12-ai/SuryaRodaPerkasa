import { ProductForm } from "@/components/products/product-form";
import { getDict } from "@/lib/i18n/server";
import { listComponentCandidates } from "@/server/services/products.service";

export default async function NewProductPage() {
  const dict = await getDict();
  const candidates = await listComponentCandidates();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.products.newProduct}</h1>
      <ProductForm
        componentOptions={candidates.map((c) => ({ id: c.id, label: `${c.sku} — ${c.name}` }))}
      />
    </div>
  );
}
