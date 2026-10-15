"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Browser client (anon key + the admin's session cookie). Subject to RLS. */
export function getBrowserClient(): SupabaseClient {
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
