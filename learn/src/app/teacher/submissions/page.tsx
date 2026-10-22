import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { SubmissionsPage } from "@/components/staff/grading-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Topshirilgan ishlar"); } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <SubmissionsPage user={await pageUser("teacher")} base="/teacher" sp={await searchParams} />;
}
