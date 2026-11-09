import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getSalesman } from "@/server/services/salesmen.service";
import { SalesmanForm } from "@/components/salesmen/salesman-form";

export default async function EditSalesmanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const salesman = await getSalesman(id);
  if (!salesman) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.salesmen.editSalesman}</h1>
      <SalesmanForm
        salesmanId={salesman.id}
        defaultValues={{
          name: salesman.name,
          phone: salesman.phone ?? "",
          monthlyTarget: Number(salesman.monthlyTarget),
          isActive: salesman.isActive,
        }}
      />
    </div>
  );
}
