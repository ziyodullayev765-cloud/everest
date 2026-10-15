import "server-only";
import { cache } from "react";
import { draftMode } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient, createSessionClient } from "@/lib/supabase/server";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@/lib/defaults";
import { isSafeHref } from "@/lib/utils";
import type {
  Achievement,
  Education,
  Experience,
  Media,
  NavItem,
  Profile,
  Project,
  SiteSettings,
  Skill,
  SocialLink,
  Stat,
} from "@/lib/types";

/**
 * Read path for the public website.
 *
 * Normal visitors: a cookie-less anon client + an explicit `status = published`
 * filter (RLS enforces the same rule in the database).
 *
 * Preview mode (enabled only by a verified admin via /api/preview): uses the
 * admin's session so drafts can be reviewed before publishing.
 *
 * Errors: when Supabase is configured, read failures THROW. During ISR
 * revalidation Next.js then keeps serving the last good page instead of
 * caching an empty one, and a build against an unreachable database fails
 * loudly. Only the "not configured" case falls back to placeholder content.
 */
interface Reader {
  db: SupabaseClient;
  preview: boolean;
}

const getReader = cache(async (): Promise<Reader | null> => {
  if (!isSupabaseConfigured) return null;
  let preview = false;
  try {
    preview = (await draftMode()).isEnabled;
  } catch {
    // Outside a request scope (e.g. sitemap generation at build time).
  }
  return preview ? { db: await createSessionClient(), preview } : { db: createPublicClient(), preview };
});

export const isPreview = cache(async () => (await getReader())?.preview ?? false);

function loadError(table: string, err: unknown) {
  const detail = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
  console.error(`[data] failed to load ${table}: ${detail}`);
  return new Error(`Could not load ${table}`);
}

// The query builder's generic types are not useful for dynamic table names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any;

async function list<T>(table: string, build: (q: Query) => Query): Promise<T[]> {
  const reader = await getReader();
  if (!reader) return [];
  try {
    let q: Query = reader.db.from(table).select("*");
    if (!reader.preview) q = q.eq("status", "published");
    const { data, error } = (await build(q)) as { data: T[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    throw loadError(table, err);
  }
}

function sanitizeLinks(value: unknown): NavItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((i): i is NavItem => !!i && typeof i === "object" && typeof i.label === "string" && typeof i.href === "string")
    .filter((i) => i.visible !== false && isSafeHref(i.href));
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const reader = await getReader();
  if (!reader) return DEFAULT_SETTINGS;
  try {
    const { data, error } = await reader.db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS;
    const s = { ...DEFAULT_SETTINGS, ...data } as SiteSettings;
    s.nav_items = sanitizeLinks(s.nav_items);
    s.footer_links = sanitizeLinks(s.footer_links);
    if (!/^#[0-9a-f]{6}$/i.test(s.accent_color)) s.accent_color = DEFAULT_SETTINGS.accent_color;
    if (!isSafeHref(s.music_url)) s.music_url = null;
    s.music_title ??= "";
    return s;
  } catch (err) {
    throw loadError("site_settings", err);
  }
});

export const getProfile = cache(async (): Promise<Profile> => {
  const reader = await getReader();
  if (!reader) return DEFAULT_PROFILE;
  try {
    const { data, error } = await reader.db.from("profiles").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data ? ({ ...DEFAULT_PROFILE, ...data } as Profile) : DEFAULT_PROFILE;
  } catch (err) {
    throw loadError("profiles", err);
  }
});

export const getProjects = cache(() =>
  list<Project>("projects", (q) => q.order("sort_order", { ascending: true }).order("created_at", { ascending: false })),
);

export const getProjectBySlug = cache(async (slug: string): Promise<Project | null> => {
  const reader = await getReader();
  if (!reader || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  try {
    let q = reader.db.from("projects").select("*").eq("slug", slug);
    if (!reader.preview) q = q.eq("status", "published");
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return (data as Project) ?? null;
  } catch (err) {
    throw loadError("projects", err);
  }
});

export const getAchievements = cache(() =>
  list<Achievement>("achievements", (q) =>
    q.order("achieved_on", { ascending: false, nullsFirst: false }).order("sort_order", { ascending: true }),
  ),
);

export const getSkills = cache(() => list<Skill>("skills", (q) => q.order("sort_order", { ascending: true }).order("name")));

export const getEducation = cache(() =>
  list<Education>("education", (q) =>
    q.order("sort_order", { ascending: true }).order("start_date", { ascending: false, nullsFirst: false }),
  ),
);

export const getExperience = cache(() =>
  list<Experience>("experience", (q) =>
    q.order("sort_order", { ascending: true }).order("start_date", { ascending: false, nullsFirst: false }),
  ),
);

export const getSocialLinks = cache(async () =>
  (await list<SocialLink>("social_links", (q) => q.order("sort_order", { ascending: true }))).filter((l) => isSafeHref(l.url)),
);

export const getStats = cache(() => list<Stat>("stats", (q) => q.order("sort_order", { ascending: true })));

export const getGallery = cache(() =>
  list<Media>("media", (q) =>
    q
      .eq("in_gallery", true)
      .eq("kind", "image")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ),
);
