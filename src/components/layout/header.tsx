"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useI18n } from "@/components/i18n-provider";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Header({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const { dict } = useI18n();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="text-sm font-medium text-muted-foreground">{dict.common.appTitle}</div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <ThemeToggle />
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {initials(userName)}
          </div>
          <div className="hidden text-right text-sm leading-tight sm:block">
            <p className="font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label={dict.common.signOut}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
