import { MediaLibrary } from "@/components/admin/media-library";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import type { Media } from "@/lib/types";

export default async function MediaAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false }).limit(1000);
  return (
    <>
      <PageTitle
        title="Media library"
        description="Every image and document you upload is stored in Supabase Storage and can be reused anywhere. Turn on “Show in public gallery” to feature an image on /gallery."
      />
      <MediaLibrary initial={(data ?? []) as Media[]} />
    </>
  );
}
