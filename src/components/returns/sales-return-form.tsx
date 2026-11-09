"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { recordSalesReturnAction } from "@/server/actions/sales-return.actions";
import { formatIDR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Line = {
  saleLineId: string;
  sku: string;
  name: string;
  sold: number;
  alreadyReturned: number;
  unitPrice: number;
};

export function SalesReturnForm({ saleId, lines }: { saleId: string; lines: Line[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.returns;

  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [number, setNumber] = useState("");
  const [restock, setRestock] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const totalValue = lines.reduce((s, l) => s + (qty[l.saleLineId] || 0) * l.unitPrice, 0);

  async function onSubmit() {
    const returnLines = lines
      .map((l) => ({ saleLineId: l.saleLineId, quantity: qty[l.saleLineId] || 0 }))
      .filter((l) => l.quantity > 0);
    if (returnLines.length === 0) return toast.error(t.nothingToReturn);
    setBusy(true);
    try {
      const { id } = await recordSalesReturnAction({
        saleId,
        date: new Date(date),
        reason,
        number,
        restock,
        lines: returnLines,
      });
      toast.success(t.recorded);
      router.push(`/returns/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.number}</Label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{dict.common.date}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t.reason}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="rusak / salah kirim / tidak laku" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
          <span>{t.restock}</span>
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">{t.restockHelp}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.products.sku}</TableHead>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead className="text-right">{t.sold}</TableHead>
            <TableHead className="text-right">{t.alreadyReturned}</TableHead>
            <TableHead className="text-right">{dict.sales.unitPrice}</TableHead>
            <TableHead className="w-32 text-right">{t.qtyToReturn}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((l) => {
            const max = l.sold - l.alreadyReturned;
            return (
              <TableRow key={l.saleLineId}>
                <TableCell className="font-mono">{l.sku}</TableCell>
                <TableCell>{l.name}</TableCell>
                <TableCell className="text-right">{l.sold}</TableCell>
                <TableCell className="text-right">{l.alreadyReturned}</TableCell>
                <TableCell className="text-right">{formatIDR(l.unitPrice)}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max={max}
                    className="text-right"
                    value={qty[l.saleLineId] ?? ""}
                    onChange={(e) =>
                      setQty((s) => ({
                        ...s,
                        [l.saleLineId]: Math.min(max, Math.max(0, e.target.valueAsNumber || 0)),
                      }))
                    }
                    disabled={max <= 0}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between rounded-md border p-4 text-sm font-medium">
        <span>{t.returnValue}</span>
        <span>{formatIDR(totalValue)}</span>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={busy || totalValue <= 0}>
          {busy ? dict.common.saving : t.record}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/sales/${saleId}`)}>
          {dict.common.cancel}
        </Button>
      </div>
    </div>
  );
}
