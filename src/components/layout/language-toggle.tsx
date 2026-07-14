"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/dictionaries";

function persistLocale(next: Locale) {
  document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageToggle() {
  const router = useRouter();
  const { locale } = useI18n();

  return (
    <div className="flex items-center rounded-md border p-0.5 text-xs">
      {(["en", "id"] as const).map((l) => (
        <Button
          key={l}
          type="button"
          variant={locale === l ? "default" : "ghost"}
          size="xs"
          onClick={() => {
            persistLocale(l);
            router.refresh();
          }}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
