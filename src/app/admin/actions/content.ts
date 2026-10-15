"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { buildSchema, flattenErrors } from "@/lib/cms/fields";
import { getResource, PROFILE_CONFIG, resourceFields, SETTINGS_CONFIG, singletonFields } from "@/lib/cms/resources";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

const uuid = z.string().uuid();

/** Translates Postgres / PostgREST errors into messages an editor can act on. */
function dbError(err: { code?: string; message?: string; details?: string } | null): ActionResult<never> {
  const code = err?.code;
  if (code === "23505") {
    const field = /slug/.test(err?.message ?? "") ? "slug" : "_form";
    return { ok: false, error: "That value is already in use.", fieldErrors: { [field]: ["Already in use — choose another."] } };
  }
  if (code === "23514") {
    if (/dates_chk/.test(err?.message ?? "")) {
      return { ok: false, error: "The end date must be after the start date." };
    }
    return { ok: false, error: "One of the values is not allowed. Please check the form." };
  }
  if (code === "42501") return { ok: false, error: "You are not authorized to perform this action." };
  console.error("[admin] database error:", err);
  return { ok: false, error: "The database rejected the change. Please try again." };
}

function fail(e: unknown): ActionResult<never> {
  if (e instanceof UnauthorizedError) return { ok: false, error: e.message };
  console.error("[admin] action failed:", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function revalidateSite() {
  // The portfolio is small; refreshing every cached public page keeps it simple and correct.
  revalidatePath("/", "layout");
}

function crossFieldChecks(values: Record<string, unknown>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const pairs: [string, string][] = [
    ["start_date", "end_date"],
    ["started_on", "completed_on"],
  ];
  for (const [a, b] of pairs) {
    const s = values[a];
    const e = values[b];
    if (typeof s === "string" && typeof e === "string" && e < s) errors[b] = ["Must be on or after the start date."];
  }
  return errors;
}

export async function saveResource(
  key: string,
  id: string | null,
  input: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const resource = getResource(key);
    if (!resource) return { ok: false, error: "Unknown content type." };
    if (id !== null && !uuid.safeParse(id).success) return { ok: false, error: "Invalid record id." };

    const { supabase } = await requireAdmin();

    const raw = { ...input };
    if ("slug" in raw && !String(raw.slug ?? "").trim()) raw.slug = slugify(String(raw[resource.titleField] ?? ""));

    // Same schema the browser used — never trust the client's validation.
    const parsed = buildSchema(resourceFields(resource)).safeParse(raw);
    if (!parsed.success)
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };

    const values = parsed.data as Record<string, unknown>;
    if (values.is_current === true) values.end_date = null;
    const cross = crossFieldChecks(values);
    if (Object.keys(cross).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: cross };

    if (id) {
      const { data, error } = await supabase.from(resource.table).update(values).eq("id", id).select("id").maybeSingle();
      if (error) return dbError(error);
      if (!data) return { ok: false, error: "Record not found (it may have been deleted)." };
      revalidateSite();
      return { ok: true, data: { id }, message: "Changes saved." };
    }

    // New records go to the end of the list.
    const { data: last } = await supabase
      .from(resource.table)
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = ((last?.sort_order as number | undefined) ?? 0) + 10;

    const { data, error } = await supabase
      .from(resource.table)
      .insert({ ...values, sort_order })
      .select("id")
      .single();
    if (error) return dbError(error);
    revalidateSite();
    return { ok: true, data: { id: data.id as string }, message: `${resource.singular} created.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteResource(key: string, id: string): Promise<ActionResult> {
  try {
    const resource = getResource(key);
    if (!resource || !uuid.safeParse(id).success) return { ok: false, error: "Invalid request." };
    const { supabase } = await requireAdmin();
    const { error, count } = await supabase.from(resource.table).delete({ count: "exact" }).eq("id", id);
    if (error) return dbError(error);
    if (!count) return { ok: false, error: "Record not found." };
    revalidateSite();
    return { ok: true, message: `${resource.singular} deleted.` };
  } catch (e) {
    return fail(e);
  }
}

export async function setResourceStatus(key: string, id: string, status: "draft" | "published"): Promise<ActionResult> {
  try {
    const resource = getResource(key);
    if (!resource || !uuid.safeParse(id).success || !["draft", "published"].includes(status)) {
      return { ok: false, error: "Invalid request." };
    }
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from(resource.table).update({ status }).eq("id", id);
    if (error) return dbError(error);
    revalidateSite();
    return { ok: true, message: status === "published" ? "Published." : "Moved to drafts." };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderResource(key: string, ids: string[]): Promise<ActionResult> {
  try {
    const resource = getResource(key);
    const parsed = z.array(uuid).max(1000).safeParse(ids);
    if (!resource || !parsed.success) return { ok: false, error: "Invalid request." };
    const { supabase } = await requireAdmin();
    const results = await Promise.all(
      parsed.data.map((id, i) =>
        supabase
          .from(resource.table)
          .update({ sort_order: (i + 1) * 10 })
          .eq("id", id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return dbError(failed.error);
    revalidateSite();
    return { ok: true, message: "Order saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSingleton(key: "profile" | "settings", input: Record<string, unknown>): Promise<ActionResult> {
  try {
    const config = key === "profile" ? PROFILE_CONFIG : key === "settings" ? SETTINGS_CONFIG : null;
    if (!config) return { ok: false, error: "Unknown settings group." };
    const { supabase } = await requireAdmin();

    const parsed = buildSchema(singletonFields(config)).safeParse(input);
    if (!parsed.success)
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };

    const { error } = await supabase.from(config.table).upsert({ id: 1, ...parsed.data }, { onConflict: "id" });
    if (error) return dbError(error);
    revalidateSite();
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}
