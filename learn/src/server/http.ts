import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { env } from "./env";
import { tr } from "@/lib/i18n/tr";

/** JSON route-handler wrapper with the same safe error mapping as server actions. */
export async function json<T>(fn: () => Promise<T>, init?: ResponseInit) {
  try {
    const data = await fn();
    return NextResponse.json({ ok: true, data }, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: e.status, headers: { "Cache-Control": "no-store" } });
    if (e instanceof ZodError) return NextResponse.json({ ok: false, error: e.issues[0]?.message ?? tr("Noto‘g‘ri so‘rov"), code: "invalid" }, { status: 422 });
    console.error("[api]", e);
    return NextResponse.json({ ok: false, error: tr("Server xatosi"), code: "server" }, { status: 500 });
  }
}

/** CSRF defence for cookie-authenticated mutating route handlers: the Origin must be our own. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin) throw new AppError("forbidden", tr("So‘rov manbasi aniqlanmadi."));
  try {
    const o = new URL(origin);
    if (o.host === host || o.origin === env.appUrl) return;
  } catch {
    /* fallthrough */
  }
  throw new AppError("forbidden", tr("Ruxsat etilmagan manba."));
}
