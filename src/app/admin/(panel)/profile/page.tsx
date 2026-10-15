import { ContentForm } from "@/components/admin/content-form";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { DEFAULT_PROFILE } from "@/lib/defaults";

export default async function ProfileAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("profiles").select("*").eq("id", 1).maybeSingle();
  return (
    <>
      <PageTitle
        title="Profile & About"
        description="Your name, title, photo, CV and everything on the About page. Text in [brackets] is a placeholder."
      />
      <ContentForm
        mode={{ type: "singleton", key: "profile" }}
        initial={(data as Record<string, unknown>) ?? (DEFAULT_PROFILE as unknown as Record<string, unknown>)}
      />
    </>
  );
}
