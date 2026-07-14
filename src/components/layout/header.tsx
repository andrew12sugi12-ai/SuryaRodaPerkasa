"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useI18n } from "@/components/i18n-provider";

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
      <div className="text-sm text-muted-foreground">{dict.common.appTitle}</div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div className="text-right text-sm leading-tight">
          <p className="font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{userRole}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          {dict.common.signOut}
        </Button>
      </div>
    </header>
  );
}
