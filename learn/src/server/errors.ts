/** Errors that are safe to show to users. Anything else is logged and replaced with a generic message. */
export class AppError extends Error {
  constructor(
    public code: "unauthenticated" | "forbidden" | "not_found" | "invalid" | "conflict" | "rate_limited" | "closed",
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
  get status() {
    return { unauthenticated: 401, forbidden: 403, not_found: 404, invalid: 422, conflict: 409, rate_limited: 429, closed: 409 }[this.code];
  }
}

export const forbidden = (msg = "Bu amal uchun ruxsat yo‘q.") => new AppError("forbidden", msg);
export const notFound = (msg = "Topilmadi.") => new AppError("not_found", msg);
export const invalid = (msg: string, fields?: Record<string, string>) => new AppError("invalid", msg, fields);
