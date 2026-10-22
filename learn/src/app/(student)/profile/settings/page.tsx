import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ProfileSettingsView } from "@/components/app/profile-settings-view";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Sozlamalar"); } };

export default async function Page() {
  return <ProfileSettingsView user={await pageUser("student")} backHref="/profile" />;
}
