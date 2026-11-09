"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import {
  startTwoFactorAction,
  confirmTwoFactorAction,
  disableTwoFactorAction,
} from "@/server/actions/twofactor.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.security;

  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    try {
      setSetup(await startTwoFactorAction());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      await confirmTwoFactorAction(code);
      toast.success(t.enabledToast);
      setSetup(null);
      setCode("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await disableTwoFactorAction(code);
      toast.success(t.disabledToast);
      setCode("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {enabled ? (
            <ShieldCheck className="size-5 text-green-600" />
          ) : (
            <ShieldAlert className="size-5 text-amber-500" />
          )}
          {t.twoFactor}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{enabled ? t.statusOn : t.statusOff}</p>

        {/* Enabled: offer disable (requires a current code) */}
        {enabled && (
          <div className="space-y-3 border-t pt-4">
            <Label htmlFor="2fa-code">{t.enterCodeDisable}</Label>
            <div className="flex gap-2">
              <Input
                id="2fa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t.codePlaceholder}
                className="w-40 tabular-nums tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button variant="destructive" disabled={busy || code.length < 6} onClick={disable}>
                {t.disable}
              </Button>
            </div>
          </div>
        )}

        {/* Not enabled, setup not started */}
        {!enabled && !setup && (
          <Button disabled={busy} onClick={begin}>
            {t.setUp}
          </Button>
        )}

        {/* Not enabled, setup in progress */}
        {!enabled && setup && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm">{t.scan}</p>
            <Image
              src={setup.qrDataUrl}
              alt="2FA QR code"
              width={180}
              height={180}
              unoptimized
              className="rounded-md border bg-white p-2"
            />
            <div className="text-sm text-muted-foreground">
              {t.cantScan}{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                {setup.secret}
              </code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="2fa-confirm">{t.enterCode}</Label>
              <div className="flex gap-2">
                <Input
                  id="2fa-confirm"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t.codePlaceholder}
                  className="w-40 tabular-nums tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button disabled={busy || code.length < 6} onClick={confirm}>
                  {t.confirm}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
