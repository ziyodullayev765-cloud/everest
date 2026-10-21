import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { NotificationsView } from "@/components/app/notifications-view";

export const metadata: Metadata = { title: "Bildirishnomalar" };

export default async function Page() {
  const u = await pageUser("teacher");
  return <NotificationsView userId={u.id} />;
}
