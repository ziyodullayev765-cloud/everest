import { MediaLibrary } from "@/components/admin/media-library";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import type { Media } from "@/lib/types";

export default async function MediaAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("media")
    .select("*")
    .neq("kind", "audio")
    .order("created_at", { ascending: false })
    .limit(1000);
  return (
    <>
      <PageTitle
        title="Media library"
        description="Images and PDFs, stored in Supabase Storage and reusable anywhere. Turn on “Show in public gallery” to feature an image on /gallery. Audio files have their own page: Audio."
      />
      <MediaLibrary initial={(data ?? []) as Media[]} />
    </>
  );
}
