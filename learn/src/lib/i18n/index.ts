import { uz, type Dictionary } from "./uz";
import { en } from "./en";
import { ru } from "./ru";

export const LOCALES = ["uz", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uz";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
const overlays: Record<Locale, DeepPartial<Dictionary>> = { uz: {}, en, ru };

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === "object" && b && typeof b === "object" ? merge(b, v as never) : v;
  }
  return out as T;
}

const cache = new Map<Locale, Dictionary>();
/** Returns the dictionary for a locale; missing keys fall back to Uzbek. */
export function dictionary(locale: string = DEFAULT_LOCALE): Dictionary {
  const l = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : DEFAULT_LOCALE;
  if (!cache.has(l)) cache.set(l, merge<Dictionary>(uz, overlays[l]));
  return cache.get(l)!;
}

export const t = dictionary(DEFAULT_LOCALE);
export type { Dictionary };
