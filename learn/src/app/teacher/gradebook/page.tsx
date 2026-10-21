import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { GradebookPage } from "@/components/staff/grading-pages";

export const metadata: Metadata = { title: "Baholar jurnali" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <GradebookPage user={await pageUser("teacher")} base="/teacher" sp={await searchParams} />;
}
