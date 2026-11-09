"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Upload, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { uploadPaymentAttachmentAction } from "@/server/actions/payments.actions";

export function AttachmentCell({
  paymentId,
  hasAttachment,
}: {
  paymentId: string;
  hasAttachment: boolean;
}) {
  const { dict } = useI18n();
  const t = dict.payments;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("paymentId", paymentId);
      fd.set("file", file);
      await uploadPaymentAttachmentAction(fd);
      toast.success(t.proofUploaded);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (hasAttachment) {
    return (
      <a
        href={`/api/attachments/payments/${paymentId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        title={t.viewProof}
      >
        <Paperclip className="size-3.5" />
        {t.proof}
      </a>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        title={t.proofHint}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {t.uploadProof}
      </button>
    </>
  );
}
