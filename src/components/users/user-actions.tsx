"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { updateUserAction, resetPasswordAction } from "@/server/actions/admin.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "BOOKKEEPER";
  isActive: boolean;
};

export function EditUserDialog({ user }: { user: UserRow }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<"ADMIN" | "BOOKKEEPER">(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      await updateUserAction(user.id, { name, email, role, isActive });
      toast.success(dict.admin.userUpdated);
      setOpen(false);
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
        {dict.common.edit}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dict.common.edit} — {user.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{dict.common.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{dict.common.email}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{dict.users.role}</Label>
            <Select
              items={{ ADMIN: "ADMIN", BOOKKEEPER: "BOOKKEEPER" }}
              value={role}
              onValueChange={(v) => setRole(v as "ADMIN" | "BOOKKEEPER")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="BOOKKEEPER">BOOKKEEPER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{dict.common.status}</Label>
            <Select
              items={{ active: dict.common.active, inactive: dict.common.inactive }}
              value={isActive ? "active" : "inactive"}
              onValueChange={(v) => setIsActive(v === "active")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{dict.common.active}</SelectItem>
                <SelectItem value="inactive">{dict.common.inactive}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{dict.admin.inactiveUserHelp}</p>
          </div>
          <Button onClick={onSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? dict.common.saving : dict.common.saveChanges}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ user }: { user: UserRow }) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      await resetPasswordAction(user.id, password);
      toast.success(dict.admin.passwordReset);
      setOpen(false);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        {dict.admin.resetPassword}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dict.admin.resetPassword} — {user.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{dict.admin.newPassword}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || password.length < 10}
            className="w-full"
          >
            {isSubmitting ? dict.common.saving : dict.admin.resetPassword}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
