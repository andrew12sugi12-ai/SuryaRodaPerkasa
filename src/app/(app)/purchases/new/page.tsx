import { listActiveSuppliers } from "@/server/services/suppliers.service";
import { getDict } from "@/lib/i18n/server";
import { listSettlementAccounts } from "@/server/services/accounts.service";
import { listStockableProducts } from "@/server/services/products.service";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default async function NewPurchasePage() {
  const dict = await getDict();
  const [suppliers, accounts, products] = await Promise.all([
    listActiveSuppliers(),
    listSettlementAccounts("purchase"),
    listStockableProducts(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.purchases.newPurchase}</h1>
      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: s.id, label: s.name }))}
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
        products={products.map((p) => ({ id: p.id, label: `${p.sku} — ${p.name}` }))}
      />
    </div>
  );
}
