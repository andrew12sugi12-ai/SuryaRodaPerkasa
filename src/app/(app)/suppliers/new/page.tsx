import { SupplierForm } from "@/components/suppliers/supplier-form";
import { getDict } from "@/lib/i18n/server";

export default async function NewSupplierPage() {
  const dict = await getDict();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.contacts.newSupplier}</h1>
      <SupplierForm />
    </div>
  );
}
