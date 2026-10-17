/**
 * Interface strings for the public site in English, Uzbek (Latin) and Russian.
 * Portfolio *content* (projects, achievements, …) comes from the database and
 * is shown as entered in the admin; these are only UI chrome strings.
 * The strings themselves live in ./locales/{en,uz,ru}.ts.
 */
import { LEGACY_NAV_HREFS } from "@/lib/defaults";
import { en, type Copy } from "./locales/en";
import { ru } from "./locales/ru";
import { uz } from "./locales/uz";

export type { Copy };

export const LOCALES = ["en", "uz", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", uz: "O‘zbekcha", ru: "Русский" };
export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", uz: "UZ", ru: "RU" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export const DICTIONARIES: Record<Locale, Copy> = { en, uz, ru };

/** Translates standard menu labels and points old "/#section" links at their own pages. */
export function localizeNav<T extends { href: string; label: string }>(items: T[], c: Copy): T[] {
  return items.map((i) => {
    const href = LEGACY_NAV_HREFS[i.href] ?? i.href;
    return { ...i, href, label: c.nav[href] ?? i.label };
  });
}

/** "2024-03-01" → "Mar 2024" (in the given language). Date-only strings, no timezone drift. */
export function monthYear(date: string | null | undefined, c: Copy): string {
  if (!date) return "";
  const m = /^(\d{4})-(\d{2})/.exec(date);
  return m ? `${c.dates.months[Number(m[2]) - 1]} ${m[1]}` : "";
}

export function fullDate(date: string | null | undefined, c: Copy): string {
  if (!date) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return m ? `${Number(m[3])} ${c.dates.months[Number(m[2]) - 1]} ${m[1]}` : "";
}

export function dateRange(start: string | null, end: string | null, current: boolean, c: Copy): string {
  const s = monthYear(start, c);
  const e = current ? c.dates.present : monthYear(end, c);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}
