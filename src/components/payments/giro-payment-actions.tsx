"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { clearGiroPaymentAction, bounceGiroPaymentAction } from "@/server/actions/payments.actions";
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

export function GiroPaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.payments;
  const [busy, setBusy] = useState(false);
  const [bounceOpen, setBounceOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function run(fn: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="outline"
        size="xs"
        disabled={busy}
        onClick={() => run(() => clearGiroPaymentAction(paymentId), t.giroCleared)}
      >
        {t.clear}
      </Button>
      <Dialog open={bounceOpen} onOpenChange={setBounceOpen}>
        <DialogTrigger render={<Button variant="outline" size="xs" />}>{t.bounce}</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.bounce}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.bounceReason}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={() =>
                run(async () => {
                  await bounceGiroPaymentAction(paymentId, reason);
                  setBounceOpen(false);
                }, t.giroBounced)
              }
            >
              {t.bounce}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
