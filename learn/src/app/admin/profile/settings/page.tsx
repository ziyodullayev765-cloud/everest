import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ProfileSettingsView } from "@/components/app/profile-settings-view";

export const metadata: Metadata = { title: "Sozlamalar" };

export default async function Page() {
  return <ProfileSettingsView user={await pageUser("admin", "super_admin")} backHref="/admin/profile" />;
}
