"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { resetDataAction } from "@/server/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetDataForm() {
  const router = useRouter();
  const { dict } = useI18n();
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onReset() {
    setIsSubmitting(true);
    try {
      await resetDataAction(confirmation);
      toast.success(dict.reset.done);
      setConfirmation("");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4 rounded-md border border-destructive/40 p-6">
      <p className="text-sm">{dict.reset.warning}</p>
      <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
        <li>{dict.reset.wipes}</li>
        <li>{dict.reset.keeps}</li>
      </ul>
      <div className="space-y-2">
        <Label>{dict.reset.typeToConfirm}</Label>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="RESET"
        />
      </div>
      <Button
        variant="destructive"
        onClick={onReset}
        disabled={isSubmitting || confirmation !== "RESET"}
      >
        {isSubmitting ? dict.common.saving : dict.reset.button}
      </Button>
    </div>
  );
}
