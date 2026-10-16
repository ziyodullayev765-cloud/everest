import { MessagesInbox } from "@/components/admin/messages-inbox";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { PushToggle } from "@/components/admin/push-toggle";
import { isPushConfigured, vapidPublicKey } from "@/lib/push";
import type { ContactMessage } from "@/lib/types";

export default async function MessagesAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (
    <>
      <PageTitle title="Messages" description="Submissions from the contact form. Opening a message marks it as read." />
      <PushToggle publicKey={vapidPublicKey} configured={isPushConfigured()} />
      <MessagesInbox initial={(data ?? []) as ContactMessage[]} />
    </>
  );
}
