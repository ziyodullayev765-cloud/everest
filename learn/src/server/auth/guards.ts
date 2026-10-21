import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { homeFor } from "./rbac";
import type { Role } from "../db/schema";
import { AppError } from "../errors";

/** For pages: redirect to login when signed out, to the user's own area when the role doesn't fit. */
export async function pageUser(...roles: Role[]): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (u.mustChangePassword) redirect("/change-password");
  if (roles.length && !roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

/** Converts service errors into the right page response (404 for not found / forbidden to avoid leaking existence). */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof AppError && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  }
}
