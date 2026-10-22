import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ProfileView } from "@/components/app/profile-view";
import { MoreLinks } from "@/components/student/more-links";
import { SoundToggle } from "@/components/app/sound-toggle";

export const metadata: Metadata = { title: "Profil" };

export default async function Page() {
  const user = await pageUser("student");
  return (
    <>
      <div className="mx-auto max-w-4xl">
        <MoreLinks />
        <div className="mb-6">
          <SoundToggle />
        </div>
      </div>
      <ProfileView user={user} />
    </>
  );
}
