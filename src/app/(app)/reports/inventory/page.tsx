import { redirect } from "next/navigation";

// Inventory is now split into two reports — Sparepart and Bicycle (Sepeda).
// Keep this old URL working by sending it to the Sparepart report.
export default function InventoryReportPage() {
  redirect("/reports/inventory/sparepart");
}
