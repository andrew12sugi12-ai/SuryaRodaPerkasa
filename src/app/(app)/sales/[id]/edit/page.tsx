import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getSale } from "@/server/services/sales.service";
import { listActiveCustomers } from "@/server/services/customers.service";
import { listSettlementAccounts } from "@/server/services/accounts.service";
import { listActiveProducts } from "@/server/services/products.service";
import { SaleForm } from "@/components/sales/sale-form";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const [sale, customers, accounts, products] = await Promise.all([
    getSale(id),
    listActiveCustomers(),
    listSettlementAccounts("sale"),
    listActiveProducts(),
  ]);
  if (!sale) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dict.common.edit} — {dict.sales.saleTitle}
      </h1>
      <SaleForm
        saleId={sale.id}
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
        products={products.map((p) => ({
          id: p.id,
          label: `${p.sku} — ${p.name}`,
          quantityOnHand: Number(p.quantityOnHand),
        }))}
        defaultValues={{
          date: sale.date,
          customerId: sale.customerId,
          paymentAccountId: sale.paymentAccountId,
          reference: sale.reference ?? "",
          lines: sale.lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        }}
      />
    </div>
  );
}
