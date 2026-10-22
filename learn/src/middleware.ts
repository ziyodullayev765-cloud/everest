import { NextResponse, type NextRequest } from "next/server";

/**
 * UX-only gate: sends visitors without a session cookie to /login. Real authorisation happens in
 * every layout, server action and route handler (getCurrentUser / requireRole + scoped checks).
 */
const PUBLIC = ["/login", "/reset", "/install", "/offline", "/manifest.webmanifest", "/sw.js", "/icons", "/api/health", "/api/cron", "/_next", "/favicon"];
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-learn_session" : "learn_session";

const MAINTENANCE_PAGE = `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Texnik ishlar</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;background:#f7f7f4;color:#1b2a22;text-align:center;padding:24px">
<div><div style="font-size:56px">🛠️</div><h1 style="margin:12px 0 6px">Texnik ishlar</h1><p style="margin:0;color:#5b6b62">Ilova tezroq ishlashi uchun yangilanmoqda. Bir necha daqiqadan so‘ng sahifani yangilang.</p></div></body></html>`;

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // MAINTENANCE=1: everything (pages and actions) answers 503 so nothing is written, e.g. while moving the database.
  if (process.env.MAINTENANCE === "1" && pathname !== "/api/health")
    return new NextResponse(MAINTENANCE_PAGE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "120", "Cache-Control": "no-store" } });
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.next(); // APIs answer 401 themselves
  if (!req.cookies.get(COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico|webmanifest|js)$).*)"] };
