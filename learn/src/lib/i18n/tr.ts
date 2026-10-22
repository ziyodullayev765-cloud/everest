/**
 * UI translation. Source strings are the Uzbek text itself; `tr("Saqlash")` returns the English entry from
 * en.json when the current locale is English, otherwise the Uzbek text. `{0}`, `{1}`… are filled from args.
 *
 * Locale: in the browser it comes from <html lang> (set by the root layout from the "lang" cookie), on the
 * server from a getter that src/server/locale.ts registers (reads the same cookie for the current request).
 * Missing English entries fall back to Uzbek, so nothing ever renders empty.
 */
import en from "./en.json";

export type Locale = "uz" | "en";
export const LOCALE_COOKIE = "lang";
const EN = en as Record<string, string>;

type Getter = () => Locale;
const g = globalThis as unknown as { __everestLocale?: Getter };

let clientLocale: Locale | null = null;
export function currentLocale(): Locale {
  if (typeof window !== "undefined") return (clientLocale ??= document.documentElement.lang === "en" ? "en" : "uz");
  try {
    return g.__everestLocale?.() ?? "uz";
  } catch {
    return "uz";
  }
}

export function registerLocaleGetter(fn: Getter) {
  g.__everestLocale = fn;
}

export function tr(s: string, ...args: unknown[]): string {
  let out = currentLocale() === "en" ? (EN[s] ?? s) : s;
  if (args.length) out = out.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < args.length ? String(args[Number(i)] ?? "") : m));
  return out;
}
