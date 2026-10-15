import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Request-scoped client that carries the signed-in user's session (cookies).
 * Every query it makes is subject to Row Level Security as that user.
 */
export async function createSessionClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The middleware refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Cookie-less anonymous client for public, cacheable reads. Because it never
 * touches request cookies, pages using it can be statically generated.
 */
export function createPublicClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
