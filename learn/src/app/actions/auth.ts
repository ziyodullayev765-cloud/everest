"use server";
import { redirect } from "next/navigation";
import { run, type ActionResult } from "@/server/action";
import { destroySession, getCurrentUser, requireUser } from "@/server/auth/session";
import { homeFor } from "@/server/auth/rbac";
import { changePassword, consumeReset, login } from "@/server/services/users";
import { audit } from "@/server/services/audit";
import { safeNext } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

export async function loginAction(_: ActionResult<{ to: string }> | null, form: FormData): Promise<ActionResult<{ to: string }>> {
  const res = await run(async () => {
    const user = await login(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
    if (user.mustChangePassword) return { to: "/change-password" };
    const home = homeFor(user.role);
    const next = safeNext(String(form.get("next") ?? ""), home);
    // Never send a student to a staff area (or vice versa) just because ?next asked for it.
    const allowed = user.role === "student" ? !next.startsWith("/admin") && !next.startsWith("/teacher") : true;
    return { to: allowed ? next : home };
  });
  if (res.ok) redirect(res.data.to);
  return res;
}

export async function logoutAction() {
  const u = await getCurrentUser();
  await destroySession();
  if (u) await audit(u.id, "auth.logout", "user", u.id);
  redirect("/login");
}

export async function changePasswordAction(_: ActionResult<string> | null, form: FormData): Promise<ActionResult<string>> {
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { ok: false, error: tr("Parollar mos kelmadi."), fields: { confirm: tr("Parollar mos kelmadi.") } };
  const res = await run(async () => {
    const u = await requireUser();
    await changePassword(u, String(form.get("current") ?? ""), next);
    return homeFor(u.role);
  });
  if (res.ok) redirect(res.data);
  return res;
}

export async function resetPasswordAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  const pw = String(form.get("password") ?? "");
  if (pw !== String(form.get("confirm") ?? "")) return { ok: false, error: tr("Parollar mos kelmadi."), fields: { confirm: tr("Parollar mos kelmadi.") } };
  const res = await run(() => consumeReset(String(form.get("token") ?? ""), pw));
  if (res.ok) redirect("/login?reset=1");
  return res;
}
