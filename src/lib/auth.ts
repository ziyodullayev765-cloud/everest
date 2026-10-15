import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

export interface AdminContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Verifies the current request belongs to an administrator.
 * - `auth.getUser()` validates the JWT with Supabase Auth (not just the cookie).
 * - Admin membership is read from `admin_users`, whose RLS only reveals the
 *   caller's own row, so the check cannot be spoofed from the client.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createSessionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data, error: adminError } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError || !data) return null;

  return { supabase, user };
});

/** For admin pages/layouts: redirects away if the caller is not an admin. */
export async function requireAdminPage(): Promise<AdminContext> {
  const ctx = await getAdmin();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You are not authorized to perform this action.");
  }
}

/** For server actions and route handlers: throws if the caller is not an admin. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdmin();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}
