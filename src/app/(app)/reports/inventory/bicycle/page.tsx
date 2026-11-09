import { listProducts } from "@/server/services/products.service";
import { getDict } from "@/lib/i18n/server";
import { isBicycleItem } from "@/lib/inventory-scope";
import { InventoryReport } from "@/components/reports/inventory-report";

export default async function BicycleInventoryReportPage() {
  const dict = await getDict();
  const products = await listProducts();
  const bicycle = products.filter(isBicycleItem);

  return (
    <InventoryReport title={dict.reports.inventoryBicycleTitle} products={bicycle} dict={dict} />
  );
}
