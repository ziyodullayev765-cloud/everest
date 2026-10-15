import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, DICTIONARIES, LOCALE_COOKIE, isLocale, type Locale } from "./dictionaries";

/**
 * The visitor's interface language: the language switcher's cookie if set,
 * otherwise the first of uz / ru / en found in Accept-Language.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(chosen)) return chosen;
    const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
    for (const part of accept.split(",")) {
      const code = part.trim().slice(0, 2);
      if (isLocale(code)) return code;
    }
  } catch {
    // Outside a request (build-time generation): fall through.
  }
  return DEFAULT_LOCALE;
});

export const getCopy = cache(async () => DICTIONARIES[await getLocale()]);
