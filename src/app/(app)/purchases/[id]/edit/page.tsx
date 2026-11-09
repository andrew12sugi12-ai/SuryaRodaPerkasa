import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getPurchase } from "@/server/services/purchases.service";
import { listActiveSuppliers } from "@/server/services/suppliers.service";
import { listSettlementAccounts } from "@/server/services/accounts.service";
import { listStockableProducts } from "@/server/services/products.service";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const [purchase, suppliers, accounts, products] = await Promise.all([
    getPurchase(id),
    listActiveSuppliers(),
    listSettlementAccounts("purchase"),
    listStockableProducts(),
  ]);
  if (!purchase) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dict.common.edit} — {dict.purchases.purchaseTitle}
      </h1>
      <PurchaseForm
        purchaseId={purchase.id}
        suppliers={suppliers.map((s) => ({ id: s.id, label: s.name }))}
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
        products={products.map((p) => ({ id: p.id, label: `${p.sku} — ${p.name}` }))}
        defaultValues={{
          date: purchase.date,
          dueDate: purchase.dueDate ?? undefined,
          supplierId: purchase.supplierId,
          paymentAccountId: purchase.paymentAccountId,
          reference: purchase.reference ?? "",
          lines: purchase.lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitCost: Number(l.unitCost),
          })),
        }}
      />
    </div>
  );
}
