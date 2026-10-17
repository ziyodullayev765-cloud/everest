import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Refreshes the Supabase session cookie and gates /admin behind sign-in.
 * This is only a first line of defence (UX); every admin page and server
 * action re-checks authorization server-side, and RLS enforces it in the DB.
 */
/**
 * Seconds until the access token in the auth cookie expires, or null when it
 * cannot be read. @supabase/ssr stores the session as "base64-<base64url JSON>",
 * split into ".0", ".1"… chunks when large.
 */
function sessionSecondsLeft(request: NextRequest): number | null {
  try {
    const cookies = request.cookies.getAll().filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
    if (!cookies.length) return null;
    const chunks = cookies
      .sort((a, b) => Number(a.name.split(".").pop()) - Number(b.name.split(".").pop()))
      .map((c) => c.value)
      .join("");
    const json = chunks.startsWith("base64-")
      ? atob(chunks.slice(7).replace(/-/g, "+").replace(/_/g, "/"))
      : decodeURIComponent(chunks);
    const session = JSON.parse(json) as { access_token?: string; expires_at?: number };
    if (!session.access_token || typeof session.expires_at !== "number") return null;
    return session.expires_at - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!isSupabaseConfigured) return response;

  // Fast path: a session that is still valid for a while needs no refresh, so
  // skip the network call here. Pages and actions still verify the user with
  // Supabase Auth and check admin rights before doing anything.
  const left = sessionSecondsLeft(request);
  if (left !== null && left > 120) return response;

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet, headers) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        if (headers) for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/admin") && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
