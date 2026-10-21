import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { SubmissionsPage } from "@/components/staff/grading-pages";

export const metadata: Metadata = { title: "Topshirilgan ishlar" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <SubmissionsPage user={await pageUser("teacher")} base="/teacher" sp={await searchParams} />;
}
