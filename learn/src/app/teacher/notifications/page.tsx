import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { NotificationsView } from "@/components/app/notifications-view";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Bildirishnomalar"); } };

export default async function Page() {
  const u = await pageUser("teacher");
  return <NotificationsView userId={u.id} />;
}
