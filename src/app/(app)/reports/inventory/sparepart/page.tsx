import { listProducts } from "@/server/services/products.service";
import { getDict } from "@/lib/i18n/server";
import { isSparepartItem } from "@/lib/inventory-scope";
import { InventoryReport } from "@/components/reports/inventory-report";

export default async function SparepartInventoryReportPage() {
  const dict = await getDict();
  const products = await listProducts();
  // Bike components are never listed here — isSparepartItem excludes them.
  const spareparts = products.filter(isSparepartItem);

  return (
    <InventoryReport title={dict.reports.inventorySparepartTitle} products={spareparts} dict={dict} />
  );
}
