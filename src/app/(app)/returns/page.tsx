import Link from "next/link";
import { getDict } from "@/lib/i18n/server";
import { listSalesReturns } from "@/server/services/sales-return.service";
import { formatIDR } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReturnsPage() {
  const dict = await getDict();
  const t = dict.returns;
  const returns = await listSalesReturns();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{t.number}</TableHead>
            <TableHead>{dict.sales.customer}</TableHead>
            <TableHead>{t.reason}</TableHead>
            <TableHead className="text-right">{t.returnValue}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/returns/${r.id}`} className="hover:underline">
                  {r.date.toLocaleDateString("id-ID")}
                </Link>
              </TableCell>
              <TableCell className="font-mono">{r.number || r.id.slice(0, 8).toUpperCase()}</TableCell>
              <TableCell>{r.customer.name}</TableCell>
              <TableCell className="text-muted-foreground">{r.reason || "—"}</TableCell>
              <TableCell className="text-right">{formatIDR(r.totalAmount)}</TableCell>
            </TableRow>
          ))}
          {returns.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t.noReturns}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
