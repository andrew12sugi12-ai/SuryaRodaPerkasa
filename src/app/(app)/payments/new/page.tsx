import { listActiveCustomers } from "@/server/services/customers.service";
import { getDict } from "@/lib/i18n/server";
import { listActiveSuppliers } from "@/server/services/suppliers.service";
import { listCashBankAccounts } from "@/server/services/accounts.service";
import { PaymentForm } from "@/components/payments/payment-form";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; customerId?: string; supplierId?: string }>;
}) {
  const dict = await getDict();
  const params = await searchParams;
  const [customers, suppliers, accounts] = await Promise.all([
    listActiveCustomers(),
    listActiveSuppliers(),
    listCashBankAccounts(),
  ]);

  const defaultType =
    params.type === "SUPPLIER_PAYMENT" || params.supplierId
      ? ("SUPPLIER_PAYMENT" as const)
      : ("CUSTOMER_RECEIPT" as const);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.payments.newPayment}</h1>
      <PaymentForm
        customers={customers.map((c) => ({ id: c.id, label: c.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, label: s.name }))}
        accounts={accounts.map((a) => ({ id: a.id, label: `${a.code} — ${a.name}` }))}
        defaultType={defaultType}
        defaultCustomerId={params.customerId}
        defaultSupplierId={params.supplierId}
      />
    </div>
  );
}
