"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { setPeriodLockAction } from "@/server/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PeriodLockForm({ currentLock }: { currentLock: string | null }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [date, setDate] = useState(currentLock ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function apply(newDate: string | null) {
    setIsSubmitting(true);
    try {
      await setPeriodLockAction(newDate);
      toast.success(dict.admin.lockUpdated);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-md space-y-4 rounded-md border p-6">
      <div className="space-y-2">
        <Label>{dict.admin.lockThrough}</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <p className="text-xs text-muted-foreground">{dict.admin.lockHelp}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => apply(date)} disabled={isSubmitting || !date}>
          {dict.admin.lock}
        </Button>
        {currentLock && (
          <Button variant="outline" onClick={() => apply(null)} disabled={isSubmitting}>
            {dict.admin.unlock}
          </Button>
        )}
      </div>
    </div>
  );
}
