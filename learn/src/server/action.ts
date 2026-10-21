import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AppError } from "./errors";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; code?: string; fields?: Record<string, string> };

/**
 * Wraps a server action body: known errors become user-safe messages; anything unexpected is logged
 * server-side and replaced with a generic message (no stack traces or SQL reach the browser).
 */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { ok: false, error: e.message, code: e.code, fields: e.fields };
    if (e instanceof ZodError) {
      const fields = Object.fromEntries(e.issues.map((i) => [i.path.join("."), i.message]));
      return { ok: false, error: e.issues[0]?.message ?? "Ma’lumotlar noto‘g‘ri.", code: "invalid", fields };
    }
    console.error("[action]", e);
    return { ok: false, error: "Kutilmagan xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.", code: "server" };
  }
}
