"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { MEDIA_BUCKET, publicMediaUrl } from "@/lib/env";
import { buildStoragePath, mediaKind, mediaMetaSchema, registerMediaSchema, uploadRequestSchema } from "@/lib/validation/media";
import type { ActionResult, GalleryImage, Media } from "@/lib/types";

const uuid = z.string().uuid();

/** Every column that may hold a media URL. Used for usage checks, replacement and cleanup. */
const URL_COLUMNS: { table: string; columns: string[] }[] = [
  { table: "profiles", columns: ["avatar_url", "resume_url"] },
  { table: "site_settings", columns: ["logo_url", "favicon_url", "og_image_url", "music_url"] },
  { table: "projects", columns: ["thumbnail_url"] },
  { table: "achievements", columns: ["image_url", "certificate_url"] },
  { table: "education", columns: ["image_url"] },
  { table: "experience", columns: ["image_url"] },
];

function fail(e: unknown): ActionResult<never> {
  if (e instanceof UnauthorizedError) return { ok: false, error: e.message };
  console.error("[admin/media] failed:", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function usageOf(db: SupabaseClient, url: string) {
  const places: string[] = [];
  for (const { table, columns } of URL_COLUMNS) {
    for (const col of columns) {
      const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq(col, url);
      if (count) places.push(`${table}.${col}${count > 1 ? ` ×${count}` : ""}`);
    }
  }
  const { count } = await db
    .from("projects")
    .select("id", { count: "exact", head: true })
    .contains("gallery", JSON.stringify([{ url }]));
  if (count) places.push(`project galleries ×${count}`);
  return places;
}

/** Points every reference to `from` at `to` (or clears it when `to` is null). */
async function rewriteReferences(db: SupabaseClient, from: string, to: string | null) {
  for (const { table, columns } of URL_COLUMNS) {
    for (const col of columns) {
      const { error } = await db
        .from(table)
        .update({ [col]: to })
        .eq(col, from);
      if (error) throw error;
    }
  }
  const { data: projects, error } = await db
    .from("projects")
    .select("id, gallery")
    .contains("gallery", JSON.stringify([{ url: from }]));
  if (error) throw error;
  for (const p of projects ?? []) {
    const gallery = (p.gallery as GalleryImage[])
      .map((g) => (g.url === from ? (to ? { ...g, url: to } : null) : g))
      .filter(Boolean);
    const { error: upErr } = await db.from("projects").update({ gallery }).eq("id", p.id);
    if (upErr) throw upErr;
  }
}

export async function listMedia(kind?: "image" | "document" | "audio"): Promise<ActionResult<Media[]>> {
  try {
    const { supabase } = await requireAdmin();
    let q = supabase.from("media").select("*").order("created_at", { ascending: false }).limit(500);
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q;
    if (error) throw error;
    return { ok: true, data: (data ?? []) as Media[] };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Step 1 of an upload: the server validates the file description, chooses a
 * safe storage path and issues a short-lived signed upload URL. The browser
 * then uploads directly to Supabase Storage (with progress), where the bucket
 * again enforces MIME type and size limits.
 */
export async function createUploadUrl(input: { fileName: string; mimeType: string; size: number }) {
  try {
    const parsed = uploadRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid file." };
    const { supabase } = await requireAdmin();
    const path = buildStoragePath(parsed.data.fileName, parsed.data.mimeType);
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[admin/media] signed url:", error);
      return { ok: false as const, error: "Could not prepare the upload. Is the storage bucket set up?" };
    }
    return { ok: true as const, data: { path: data.path, signedUrl: data.signedUrl } };
  } catch (e) {
    return fail(e);
  }
}

/** Step 2: verify the object really exists in storage, then record it in the library. */
export async function registerMedia(input: z.input<typeof registerMediaSchema>): Promise<ActionResult<Media>> {
  try {
    const parsed = registerMediaSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file." };
    const { supabase } = await requireAdmin();
    const d = parsed.data;

    const dir = d.path.slice(0, d.path.lastIndexOf("/"));
    const name = d.path.slice(d.path.lastIndexOf("/") + 1);
    const { data: listing, error: listErr } = await supabase.storage.from(MEDIA_BUCKET).list(dir, { search: name, limit: 5 });
    if (listErr || !listing?.some((o) => o.name === name)) {
      return { ok: false, error: "The uploaded file could not be found in storage." };
    }

    const kind = mediaKind(d.mimeType)!;
    const { data, error } = await supabase
      .from("media")
      .insert({
        path: d.path,
        url: publicMediaUrl(d.path),
        file_name: d.fileName,
        mime_type: d.mimeType,
        size_bytes: d.size,
        kind,
        width: d.width ?? null,
        height: d.height ?? null,
        alt_text: d.altText,
        ...(d.inGallery && kind === "image" ? { in_gallery: true, status: "published" } : {}),
      })
      .select("*")
      .single();
    if (error) {
      await supabase.storage.from(MEDIA_BUCKET).remove([d.path]);
      throw error;
    }
    if (d.inGallery && kind === "image") revalidatePath("/", "layout");
    return { ok: true, data: data as Media, message: "Uploaded." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMediaMeta(id: string, input: z.input<typeof mediaMetaSchema>): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
    const parsed = mediaMetaSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid values." };
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("media").update(parsed.data).eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return fail(e);
  }
}

export async function getMediaUsage(id: string): Promise<ActionResult<string[]>> {
  try {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
    const { supabase } = await requireAdmin();
    const { data: media } = await supabase.from("media").select("url").eq("id", id).maybeSingle();
    if (!media) return { ok: false, error: "File not found." };
    return { ok: true, data: await usageOf(supabase, media.url as string) };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Deletes the library record and the stored file. If the file is still used
 * somewhere, nothing happens unless `force` is set — then references are
 * cleared first so the site never shows broken images.
 */
export async function deleteMedia(id: string, force = false): Promise<ActionResult<{ usage?: string[] }>> {
  try {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
    const { supabase } = await requireAdmin();
    const { data: media } = await supabase.from("media").select("*").eq("id", id).maybeSingle();
    if (!media) return { ok: false, error: "File not found." };

    const usage = await usageOf(supabase, media.url as string);
    if (usage.length && !force) {
      return { ok: false, error: `This file is still used in: ${usage.join(", ")}.` };
    }
    if (usage.length) await rewriteReferences(supabase, media.url as string, null);

    const { error: rmErr } = await supabase.storage.from(MEDIA_BUCKET).remove([media.path as string]);
    if (rmErr) throw rmErr;
    const { error } = await supabase.from("media").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "File deleted." };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Swaps the file behind a library item (after a new upload via createUploadUrl).
 * Every page that used the old file is pointed at the new one, then the old
 * object is removed from storage.
 */
export async function replaceMedia(id: string, input: z.input<typeof registerMediaSchema>): Promise<ActionResult<Media>> {
  try {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid id." };
    const parsed = registerMediaSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file." };
    const { supabase } = await requireAdmin();
    const { data: old } = await supabase.from("media").select("*").eq("id", id).maybeSingle();
    if (!old) return { ok: false, error: "File not found." };

    const d = parsed.data;
    const newKind = mediaKind(d.mimeType)!;
    if (newKind !== old.kind) {
      await supabase.storage.from(MEDIA_BUCKET).remove([d.path]);
      return { ok: false, error: `Replace an ${old.kind} with another ${old.kind}.` };
    }

    const newUrl = publicMediaUrl(d.path);
    const { data, error } = await supabase
      .from("media")
      .update({
        path: d.path,
        url: newUrl,
        file_name: d.fileName,
        mime_type: d.mimeType,
        size_bytes: d.size,
        width: d.width ?? null,
        height: d.height ?? null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    await rewriteReferences(supabase, old.url as string, newUrl);
    await supabase.storage.from(MEDIA_BUCKET).remove([old.path as string]);
    revalidatePath("/", "layout");
    return { ok: true, data: data as Media, message: "File replaced everywhere it was used." };
  } catch (e) {
    return fail(e);
  }
}
