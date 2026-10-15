import { ContentForm } from "@/components/admin/content-form";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";

export default async function MusicAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("site_settings").select("music_url, music_title").eq("id", 1).maybeSingle();
  return (
    <>
      <PageTitle title="Music" description="The background track visitors can play from the music button on the site." />
      <ContentForm mode={{ type: "singleton", key: "music" }} initial={(data as Record<string, unknown>) ?? {}} />
    </>
  );
}
