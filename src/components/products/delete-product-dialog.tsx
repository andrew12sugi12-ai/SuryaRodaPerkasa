"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { deleteProductAction } from "@/server/actions/products.actions";
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

// Deliberately hard to trigger: lives in a "Danger zone" on the edit page, and
// the confirm button stays disabled until the exact SKU is typed back.
export function DeleteProductDialog({
  productId,
  sku,
}: {
  productId: string;
  sku: string;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.products;
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText.trim() === sku && !isDeleting;

  async function onDelete() {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteProductAction(productId);
      if (res.ok) {
        toast.success(t.productDeleted);
        router.push("/products");
        router.refresh();
        return;
      }
      if (res.reason === "history") toast.error(t.deleteBlockedHistory);
      else if (res.reason === "component") toast.error(t.deleteBlockedComponent);
      else toast.error(dict.common.somethingWentWrong);
    } catch {
      toast.error(dict.common.somethingWentWrong);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-3 rounded-md border border-destructive/40 p-4">
      <div>
        <p className="text-sm font-medium text-destructive">{t.dangerZone}</p>
        <p className="text-xs text-muted-foreground">{t.deleteProductHelp}</p>
      </div>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setConfirmText("");
        }}
      >
        <DialogTrigger
          render={
            <Button type="button" variant="outline" className="text-destructive border-destructive/50" />
          }
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {t.deleteProduct}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteProduct}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.deleteProductHelp}</p>
            <div className="space-y-1.5">
              <Label>{t.deleteConfirmPrompt}</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t.deleteConfirmPlaceholder.replace("{sku}", sku)}
                autoComplete="off"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {dict.common.cancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canDelete}
                onClick={onDelete}
              >
                {isDeleting ? t.deleting : t.deleteButton}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
