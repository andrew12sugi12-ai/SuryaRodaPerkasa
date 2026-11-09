import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getPurchase } from "@/server/services/purchases.service";
import { listLandedCostOffsetAccounts } from "@/server/services/accounts.service";
import { LandedCostForm } from "@/components/purchases/landed-cost-form";

export default async function LandedCostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const [purchase, offsetAccounts] = await Promise.all([
    getPurchase(id),
    listLandedCostOffsetAccounts(),
  ]);
  if (!purchase) notFound();

  const lines = purchase.lines.map((l) => ({
    id: l.id,
    sku: l.product.sku,
    name: l.product.name,
    lineValue: Number(l.lineTotal),
    purchasedQty: Number(l.quantity),
    onHand: Number(l.product.quantityOnHand),
    unitCost: Number(l.product.unitCost),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dict.landedCost.title}</h1>
        <p className="text-sm text-muted-foreground">
          {dict.purchases.purchaseTitle}: {purchase.supplier.name} ·{" "}
          {purchase.date.toLocaleDateString("id-ID")}
          {purchase.reference ? ` · ${purchase.reference}` : ""}
        </p>
      </div>
      <LandedCostForm
        purchaseId={purchase.id}
        lines={lines}
        offsetAccounts={offsetAccounts.map((a) => ({
          id: a.id,
          label: `${a.code} — ${a.name}`,
        }))}
      />
    </div>
  );
}
