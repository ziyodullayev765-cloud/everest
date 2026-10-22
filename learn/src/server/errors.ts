import { tr } from "@/lib/i18n/tr";
/** Errors that are safe to show to users. Anything else is logged and replaced with a generic message. */
export class AppError extends Error {
  constructor(
    public code: "unauthenticated" | "forbidden" | "not_found" | "invalid" | "conflict" | "rate_limited" | "closed" | "unavailable",
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
  get status() {
    return { unauthenticated: 401, forbidden: 403, not_found: 404, invalid: 422, conflict: 409, rate_limited: 429, closed: 409, unavailable: 503 }[this.code];
  }
}

export const forbidden = (msg = tr("Bu amal uchun ruxsat yo‘q.")) => new AppError("forbidden", msg);
export const notFound = (msg = "Topilmadi.") => new AppError("not_found", msg);
export const invalid = (msg: string, fields?: Record<string, string>) => new AppError("invalid", msg, fields);

/** Postgres unique violation — drizzle wraps driver errors, so check the cause too. */
export function isUniqueViolation(e: unknown) {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code === "23505" || x?.cause?.code === "23505";
}
