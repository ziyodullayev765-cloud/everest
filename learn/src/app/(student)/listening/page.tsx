import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PracticeSection } from "@/components/student/practice-section";

export const metadata: Metadata = { title: "Listening" };

export default async function Page({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const user = await pageUser("student");
  return <PracticeSection studentId={user.id} area="listening" level={(await searchParams).level} />;
}
