/**
 * Public (browser-safe) configuration. Only NEXT_PUBLIC_* values belong here.
 * The Supabase service-role key is never read by the application runtime; it
 * is used exclusively by the one-off admin setup script in /scripts.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const MEDIA_BUCKET = "media";

export function publicMediaUrl(path: string) {
  return `${env.supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
