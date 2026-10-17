"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

const id = z.string().uuid();

function fail(e: unknown): ActionResult<never> {
  if (e instanceof UnauthorizedError) return { ok: false, error: e.message };
  console.error("[guestbook] admin action failed:", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function setGuestbookApproved(entryId: string, approved: boolean): Promise<ActionResult> {
  try {
    if (!id.safeParse(entryId).success) return { ok: false, error: "Invalid request." };
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("guestbook_entries").update({ approved: !!approved }).eq("id", entryId);
    if (error) return { ok: false, error: "The database rejected the change." };
    revalidatePath("/guestbook");
    return { ok: true, message: approved ? "Approved — now visible on the site." : "Hidden from the site." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGuestbookEntry(entryId: string): Promise<ActionResult> {
  try {
    if (!id.safeParse(entryId).success) return { ok: false, error: "Invalid request." };
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("guestbook_entries").delete().eq("id", entryId);
    if (error) return { ok: false, error: "The database rejected the change." };
    revalidatePath("/guestbook");
    return { ok: true, message: "Deleted." };
  } catch (e) {
    return fail(e);
  }
}
