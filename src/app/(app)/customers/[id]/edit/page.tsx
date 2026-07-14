import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getCustomer } from "@/server/services/customers.service";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.contacts.editCustomer}</h1>
      <CustomerForm
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          contactName: customer.contactName ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          isActive: customer.isActive,
        }}
      />
    </div>
  );
}
