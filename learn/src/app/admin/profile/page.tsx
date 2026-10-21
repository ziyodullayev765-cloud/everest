import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ProfileView } from "@/components/app/profile-view";

export const metadata: Metadata = { title: "Profil" };

export default async function Page() {
  return <ProfileView user={await pageUser("admin", "super_admin")} />;
}
