import { GuestbookModeration, type AdminGuestbookEntry } from "@/components/admin/guestbook-moderation";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";

export default async function GuestbookAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("guestbook_entries")
    .select("id, name, message, approved, created_at")
    .order("approved", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  return (
    <>
      <PageTitle
        title="Guestbook"
        description="Notes visitors left at /guestbook. Nothing is shown on the site until you approve it."
      />
      <GuestbookModeration initial={(data ?? []) as AdminGuestbookEntry[]} />
    </>
  );
}
