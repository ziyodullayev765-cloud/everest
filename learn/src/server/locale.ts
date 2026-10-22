import "server-only";
import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { LOCALE_COOKIE, registerLocaleGetter } from "@/lib/i18n/tr";

/**
 * Lets tr() know the request's language on the server (server components, actions, and the SSR pass of
 * client components). Synchronous cookie access keeps tr() a plain function everywhere.
 */
registerLocaleGetter(() => ((cookies() as unknown as UnsafeUnwrappedCookies).get(LOCALE_COOKIE)?.value === "en" ? "en" : "uz"));

export async function requestLocale() {
  return (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "uz";
}

const YEAR = 365 * 86400;
/** Remembers the language on this device (read by tr() and the root layout). */
export async function setLocaleCookie(locale: "uz" | "en") {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

/** The language chosen on this device, if any. */
export async function deviceLocale(): Promise<"uz" | "en" | null> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "en" || v === "uz" ? v : null;
}
