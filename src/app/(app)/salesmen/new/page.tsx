import { getDict } from "@/lib/i18n/server";
import { SalesmanForm } from "@/components/salesmen/salesman-form";

export default async function NewSalesmanPage() {
  const dict = await getDict();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.salesmen.newSalesman}</h1>
      <SalesmanForm />
    </div>
  );
}
