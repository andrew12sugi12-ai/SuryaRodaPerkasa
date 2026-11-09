import { CustomerForm } from "@/components/customers/customer-form";
import { getDict } from "@/lib/i18n/server";
import { listActiveSalesmen } from "@/server/services/salesmen.service";

export default async function NewCustomerPage() {
  const dict = await getDict();
  const salesmen = await listActiveSalesmen();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.contacts.newCustomer}</h1>
      <CustomerForm salesmen={salesmen.map((s) => ({ id: s.id, label: s.name }))} />
    </div>
  );
}
