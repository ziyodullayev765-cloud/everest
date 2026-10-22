import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { LeaderboardView } from "@/components/app/leaderboard-view";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Haftalik reyting"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const user = await pageUser("teacher");
  const { g } = await searchParams;
  return <LeaderboardView user={user} base="/teacher/leaderboard" groupId={g} />;
}
