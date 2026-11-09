"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { recordLandedCostAction } from "@/server/actions/landed-cost.actions";
import { formatIDR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Line = {
  id: string;
  sku: string;
  name: string;
  lineValue: number;
  purchasedQty: number;
  onHand: number;
  unitCost: number;
};

type Option = { id: string; label: string };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function LandedCostForm({
  purchaseId,
  lines,
  offsetAccounts,
}: {
  purchaseId: string;
  lines: Line[];
  offsetAccounts: Option[];
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.landedCost;

  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(lines.map((l) => [l.id, true]))
  );
  const [totalCost, setTotalCost] = useState<number>(0);
  const [offsetAccountId, setOffsetAccountId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const offsetItems = Object.fromEntries(offsetAccounts.map((a) => [a.id, a.label]));

  // Client-side preview (the server recomputes authoritatively on submit).
  const preview = useMemo(() => {
    const chosen = lines.filter((l) => selected[l.id]);
    const totalValue = chosen.reduce((s, l) => s + l.lineValue, 0);
    const total = round2(totalCost || 0);
    if (chosen.length === 0 || totalValue <= 0 || total <= 0) {
      return { rows: [], totalToInventory: 0, totalToCOGS: 0 };
    }
    let allocatedSoFar = 0;
    const rows = chosen.map((l, idx) => {
      const allocated =
        idx === chosen.length - 1
          ? round2(total - allocatedSoFar)
          : round2((total * l.lineValue) / totalValue);
      allocatedSoFar += allocated;
      const unsoldFraction = l.purchasedQty > 0 ? Math.min(1, l.onHand / l.purchasedQty) : 0;
      const toInventory = round2(allocated * unsoldFraction);
      const toCOGS = round2(allocated - toInventory);
      const newUnitCost =
        l.onHand > 0 && toInventory > 0
          ? round2((l.onHand * l.unitCost + toInventory) / l.onHand)
          : l.unitCost;
      return { ...l, allocated, toInventory, toCOGS, newUnitCost };
    });
    return {
      rows,
      totalToInventory: round2(rows.reduce((s, r) => s + r.toInventory, 0)),
      totalToCOGS: round2(rows.reduce((s, r) => s + r.toCOGS, 0)),
    };
  }, [lines, selected, totalCost]);

  async function onSubmit() {
    const selectedLineIds = lines.filter((l) => selected[l.id]).map((l) => l.id);
    if (selectedLineIds.length === 0) return toast.error(t.noLinesSelected);
    setIsSubmitting(true);
    try {
      await recordLandedCostAction({
        purchaseId,
        selectedLineIds,
        totalCost,
        offsetAccountId,
        date: new Date(date),
        reference,
        memo,
      });
      toast.success(t.recorded);
      router.push(`/purchases/${purchaseId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">{t.help}</p>

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.totalCost}</Label>
          <CurrencyInput value={totalCost} onValueChange={(v) => setTotalCost(v ?? 0)} />
        </div>
        <div className="space-y-2">
          <Label>{dict.common.date}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t.offsetAccount}</Label>
          <Select
            items={offsetItems}
            value={offsetAccountId}
            onValueChange={(v) => setOffsetAccountId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kas/Bank/Hutang" />
            </SelectTrigger>
            <SelectContent>
              {offsetAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.reference}</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.applyToProducts}</Label>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>{dict.products.sku}</TableHead>
              <TableHead>{dict.common.name}</TableHead>
              <TableHead className="text-right">{t.purchased}</TableHead>
              <TableHead className="text-right">{t.inStock}</TableHead>
              <TableHead className="text-right">{t.allocated}</TableHead>
              <TableHead className="text-right">{t.toCOGS}</TableHead>
              <TableHead className="text-right">{t.toInventory}</TableHead>
              <TableHead className="text-right">{t.newUnitCost}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => {
              const row = preview.rows.find((r) => r.id === l.id);
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={!!selected[l.id]}
                      onChange={(e) =>
                        setSelected((s) => ({ ...s, [l.id]: e.target.checked }))
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono">{l.sku}</TableCell>
                  <TableCell>{l.name}</TableCell>
                  <TableCell className="text-right">{l.purchasedQty}</TableCell>
                  <TableCell className="text-right">{l.onHand}</TableCell>
                  <TableCell className="text-right">{row ? formatIDR(row.allocated) : "—"}</TableCell>
                  <TableCell className="text-right">{row ? formatIDR(row.toCOGS) : "—"}</TableCell>
                  <TableCell className="text-right">{row ? formatIDR(row.toInventory) : "—"}</TableCell>
                  <TableCell className="text-right">
                    {row && row.newUnitCost !== l.unitCost ? (
                      <span className="font-medium">{formatIDR(row.newUnitCost)}</span>
                    ) : (
                      formatIDR(l.unitCost)
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {preview.rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6}>{dict.common.total}</TableCell>
                <TableCell className="text-right">{formatIDR(preview.totalToCOGS)}</TableCell>
                <TableCell className="text-right">{formatIDR(preview.totalToInventory)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={isSubmitting || totalCost <= 0 || !offsetAccountId}>
          {isSubmitting ? dict.common.saving : t.record}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/purchases/${purchaseId}`)}
        >
          {dict.common.cancel}
        </Button>
      </div>
    </div>
  );
}
