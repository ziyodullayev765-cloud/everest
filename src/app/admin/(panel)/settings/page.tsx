import { ContentForm } from "@/components/admin/content-form";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/defaults";

export default async function SettingsAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return (
    <>
      <PageTitle
        title="Site settings"
        description="Hero, appearance, contact details, SEO, navigation, footer and privacy policy."
      />
      <ContentForm
        mode={{ type: "singleton", key: "settings" }}
        initial={(data as Record<string, unknown>) ?? (DEFAULT_SETTINGS as unknown as Record<string, unknown>)}
      />
    </>
  );
}
