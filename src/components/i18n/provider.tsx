"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DICTIONARIES, DEFAULT_LOCALE, type Copy, type Locale } from "@/lib/i18n/dictionaries";

const I18nContext = createContext<{ locale: Locale; copy: Copy }>({
  locale: DEFAULT_LOCALE,
  copy: DICTIONARIES[DEFAULT_LOCALE],
});

/** Hands the server-chosen language to client components. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, copy: DICTIONARIES[locale] }}>{children}</I18nContext.Provider>;
}

export const useCopy = () => useContext(I18nContext).copy;
export const useLocale = () => useContext(I18nContext).locale;
