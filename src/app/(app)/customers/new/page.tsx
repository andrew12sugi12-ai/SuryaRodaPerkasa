import { CustomerForm } from "@/components/customers/customer-form";
import { getDict } from "@/lib/i18n/server";

export default async function NewCustomerPage() {
  const dict = await getDict();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.contacts.newCustomer}</h1>
      <CustomerForm />
    </div>
  );
}
