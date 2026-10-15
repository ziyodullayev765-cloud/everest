"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().optional(),
});

const GENERIC = "Incorrect email or password.";

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Supabase is not configured. See README → Configuration." };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC };

  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 8, 10 * 60_000) || !rateLimit(`login:${parsed.data.email}`, 8, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { ok: false, error: GENERIC };

  // Signing in is not enough: the account must be listed in admin_users.
  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account does not have administrator access." };
  }

  const dest = safeInternalPath(parsed.data.next, "/admin");
  redirect(dest.startsWith("/admin") ? dest : "/admin");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(200)
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/\d/, "Include a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export async function changePassword(input: z.input<typeof passwordSchema>): Promise<ActionResult> {
  try {
    const parsed = passwordSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
    const { supabase, user } = await requireAdmin();
    if (!user.email) return { ok: false, error: "Account has no email address." };

    // Re-authenticate before changing credentials.
    const { error: reauth } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.current });
    if (reauth) return { ok: false, error: "Current password is incorrect." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Password updated." };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { ok: false, error: e.message };
    console.error("[admin/auth] change password:", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
