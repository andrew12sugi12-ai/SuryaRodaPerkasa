"use client";

import { createContext, useContext } from "react";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";
import { dictionaries } from "@/lib/i18n/dictionaries";

const I18nContext = createContext<{ dict: Dict; locale: Locale }>({
  dict: dictionaries.en,
  locale: "en",
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ dict: dictionaries[locale], locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
