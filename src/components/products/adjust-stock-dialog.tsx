"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { adjustStockAction } from "@/server/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdjustStockDialog({
  productId,
  productLabel,
  currentQuantity,
}: {
  productId: string;
  productLabel: string;
  currentQuantity: number;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [actualQuantity, setActualQuantity] = useState(currentQuantity);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      await adjustStockAction({ productId, actualQuantity, reason });
      toast.success(dict.adjust.adjusted);
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        {dict.adjust.adjustStock}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dict.adjust.adjustStock} — {productLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {dict.adjust.recordedQty}: <span className="font-medium">{currentQuantity}</span>
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{dict.adjust.actualQty}</Label>
            <Input
              type="number"
              min="0"
              value={actualQuantity}
              onChange={(e) => setActualQuantity(e.target.valueAsNumber || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>{dict.adjust.reason}</Label>
            <Input
              placeholder={dict.adjust.reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{dict.adjust.help}</p>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="w-full"
          >
            {isSubmitting ? dict.common.saving : dict.adjust.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
