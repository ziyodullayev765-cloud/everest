import Link from "next/link";
import { MediaLibrary } from "@/components/admin/media-library";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import type { Media } from "@/lib/types";

/** Audio files only (background music and other sound), separate from images and documents. */
export default async function AudioAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("media")
    .select("*")
    .eq("kind", "audio")
    .order("created_at", { ascending: false })
    .limit(500);
  return (
    <>
      <PageTitle
        title="Audio"
        description="Music and other audio files (MP3, M4A, OGG, WAV — up to 15 MB each)."
        actions={
          <Link
            prefetch={false}
            href="/admin/music"
            className="border-line inline-flex h-10 items-center rounded-xl border px-4 text-sm hover:bg-white/[0.06]"
          >
            Choose the site’s background music →
          </Link>
        }
      />
      <MediaLibrary initial={(data ?? []) as Media[]} section="audio" />
    </>
  );
}
