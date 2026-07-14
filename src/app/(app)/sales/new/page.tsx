import { listActiveCustomers } from "@/server/services/customers.service";
import { getDict } from "@/lib/i18n/server";
import { listSettlementAccounts } from "@/server/services/accounts.service";
import { listActiveProducts } from "@/server/services/products.service";
import { SaleForm } from "@/components/sales/sale-form";

export default async function NewSalePage() {
  const dict = await getDict();
  const [customers, accounts, products] = await Promise.all([
    listActiveCustomers(),
    listSettlementAccounts("sale"),
    listActiveProducts(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.sales.newSale}</h1>
      <SaleForm
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
        products={products.map((p) => ({
          id: p.id,
          label: `${p.sku} — ${p.name}`,
          quantityOnHand: Number(p.quantityOnHand),
        }))}
      />
    </div>
  );
}
