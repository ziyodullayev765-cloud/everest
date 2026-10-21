import { NextResponse, type NextRequest } from "next/server";

/**
 * UX-only gate: sends visitors without a session cookie to /login. Real authorisation happens in
 * every layout, server action and route handler (getCurrentUser / requireRole + scoped checks).
 */
const PUBLIC = ["/login", "/reset", "/install", "/offline", "/manifest.webmanifest", "/sw.js", "/icons", "/api/health", "/api/cron", "/_next", "/favicon"];
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-learn_session" : "learn_session";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
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
