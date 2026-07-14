import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { listSales } from "@/server/services/sales.service";
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

export default async function SalesPage() {
  const dict = await getDict();
  const sales = await listSales();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.sales.title}</h1>
        <LinkButton href="/sales/new">{dict.sales.newSale}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{dict.sales.customer}</TableHead>
            <TableHead>{dict.common.reference}</TableHead>
            <TableHead className="text-right">{dict.common.total}</TableHead>
            <TableHead className="text-right">{dict.journal.cogs}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>
                <Link href={`/sales/${sale.id}`} className="block">
                  {sale.date.toLocaleDateString("id-ID")}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/sales/${sale.id}`} className="block">
                  {sale.customer.name}
                </Link>
              </TableCell>
              <TableCell>{sale.reference || "—"}</TableCell>
              <TableCell className="text-right">{formatIDR(sale.totalAmount)}</TableCell>
              <TableCell className="text-right">{formatIDR(sale.totalCOGS)}</TableCell>
            </TableRow>
          ))}
          {sales.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {dict.sales.noSales}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
