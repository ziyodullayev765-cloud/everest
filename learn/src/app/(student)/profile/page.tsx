import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ProfileHub } from "@/components/app/profile-hub";

export const metadata: Metadata = { title: "Profil" };

export default async function Page() {
  return <ProfileHub user={await pageUser("student")} />;
}
