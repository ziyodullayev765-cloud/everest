import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PracticeSection } from "@/components/student/practice-section";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Reading"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const user = await pageUser("student");
  return <PracticeSection studentId={user.id} area="reading" level={(await searchParams).level} />;
}
