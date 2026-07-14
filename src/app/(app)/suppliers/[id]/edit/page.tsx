import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getSupplier } from "@/server/services/suppliers.service";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.contacts.editSupplier}</h1>
      <SupplierForm
        supplierId={supplier.id}
        defaultValues={{
          name: supplier.name,
          contactName: supplier.contactName ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          isActive: supplier.isActive,
        }}
      />
    </div>
  );
}
