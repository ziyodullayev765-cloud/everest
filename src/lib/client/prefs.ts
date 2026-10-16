import { THEME_KEY } from "@/lib/theme-script";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";

export const THEME_EVENT = "portfolio:theme";

/** Flips light/dark, remembers it, and tells any theme toggle on the page. */
export function toggleTheme(): boolean {
  const light = !document.documentElement.classList.contains("light");
  document.documentElement.classList.toggle("light", light);
  try {
    localStorage.setItem(THEME_KEY, light ? "light" : "dark");
  } catch {}
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: light }));
  return light;
}

/** Stores the interface language; the caller refreshes the router afterwards. */
export function storeLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = l;
}
