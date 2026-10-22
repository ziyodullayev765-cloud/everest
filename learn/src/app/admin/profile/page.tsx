import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ProfileHub } from "@/components/app/profile-hub";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Profil"); } };

export default async function Page() {
  return <ProfileHub user={await pageUser("admin", "super_admin")} />;
}
