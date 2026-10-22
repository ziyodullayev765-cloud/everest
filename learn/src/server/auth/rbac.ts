/**
 * Role-based access control. Pure helpers here; data-scoped checks live in services/access.ts.
 * Every server action and route handler goes through these — hiding a button is never the control.
 */
import type { Role } from "../db/schema";
import { tr } from "@/lib/i18n/tr";

export type Actor = { id: string; role: Role; permissions: string[]; displayName?: string };

export const PERMISSIONS = {
  get "assignments.create"() { return tr("Vazifa va quiz yaratish"); },
  get "grades.edit_final"() { return tr("Yakunlangan baholarni o‘zgartirish"); },
  get "classes.all"() { return tr("Barcha guruhlarga kirish"); },
  get "reports.export"() { return tr("Hisobotlarni eksport qilish"); },
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const isSuperAdmin = (a: Actor) => a.role === "super_admin";
export const isAdmin = (a: Actor) => a.role === "super_admin" || a.role === "admin";
export const isTeacher = (a: Actor) => a.role === "teacher";
export const isStaff = (a: Actor) => isAdmin(a) || isTeacher(a);
export const isStudent = (a: Actor) => a.role === "student";

/** Admins hold every permission; teachers only what was granted to them. */
export function can(a: Actor, p: Permission): boolean {
  if (isAdmin(a)) return true;
  if (isTeacher(a)) return a.permissions.includes(p);
  return false;
}

/** Which roles an actor may create or manage. Only a super admin can manage admins. */
export function canManageRole(a: Actor, target: Role): boolean {
  if (isSuperAdmin(a)) return true;
  if (a.role === "admin") return target === "teacher" || target === "student";
  return false;
}

export function homeFor(role: Role): string {
  if (role === "student") return "/";
  if (role === "teacher") return "/teacher";
  return "/admin";
}
