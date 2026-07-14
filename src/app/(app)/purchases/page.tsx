import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { listPurchases } from "@/server/services/purchases.service";
import { formatIDR } from "@/lib/currency";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PurchasesPage() {
  const dict = await getDict();
  const purchases = await listPurchases();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.purchases.title}</h1>
        <LinkButton href="/purchases/new">{dict.purchases.newPurchase}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{dict.purchases.supplier}</TableHead>
            <TableHead>{dict.common.reference}</TableHead>
            <TableHead className="text-right">{dict.common.total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>
                <Link href={`/purchases/${purchase.id}`} className="block">
                  {purchase.date.toLocaleDateString("id-ID")}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/purchases/${purchase.id}`} className="block">
                  {purchase.supplier.name}
                </Link>
              </TableCell>
              <TableCell>{purchase.reference || "—"}</TableCell>
              <TableCell className="text-right">{formatIDR(purchase.totalAmount)}</TableCell>
            </TableRow>
          ))}
          {purchases.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {dict.purchases.noPurchases}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
