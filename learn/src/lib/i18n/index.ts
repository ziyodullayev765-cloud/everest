import { uz, type Dictionary } from "./uz";
import { tr } from "./tr";

export { tr, currentLocale, LOCALE_COOKIE, type Locale } from "./tr";

/** Wraps the dictionary so every string is looked up in the current locale at the moment it is read. */
function localized<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, recv) {
      const v = Reflect.get(target, key, recv);
      if (typeof v === "string") return tr(v);
      if (v && typeof v === "object") return localized(v as object);
      return v;
    },
  });
}

export const t: Dictionary = localized(uz);
export type { Dictionary };
