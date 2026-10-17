import { MessagesInbox } from "@/components/admin/messages-inbox";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { PushToggle } from "@/components/admin/push-toggle";
import { isPushConfigured, vapidPublicKey } from "@/lib/push";
import { isEmailConfigured } from "@/lib/email";
import type { ContactMessage } from "@/lib/types";

export default async function MessagesAdmin() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const msgs = (data ?? []) as ContactMessage[];
  const now = Date.now();
  const within = (days: number) => msgs.filter((m) => now - new Date(m.created_at).getTime() < days * 86_400_000).length;
  const senders = new Set(msgs.map((m) => m.email.toLowerCase())).size;
  const stats = [
    { label: "Unread", value: msgs.filter((m) => m.status === "new").length },
    { label: "Last 7 days", value: within(7) },
    { label: "Last 30 days", value: within(30) },
    { label: "Unique senders", value: senders },
  ];
  return (
    <>
      <PageTitle title="Messages" description="Submissions from the contact form. Opening a message marks it as read." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-line rounded-2xl border bg-white/[0.025] p-4">
            <p className="text-muted text-xs">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <PushToggle publicKey={vapidPublicKey} configured={isPushConfigured()} />
      <p className="text-subtle mb-4 text-xs">
        {isEmailConfigured()
          ? "E-mail copies: on — every new message is also sent to your inbox."
          : "E-mail copies: off. To also get messages by e-mail, add RESEND_API_KEY and CONTACT_NOTIFY_EMAIL in Vercel → Settings → Environment Variables."}
      </p>
      <MessagesInbox initial={msgs} />
    </>
  );
}
