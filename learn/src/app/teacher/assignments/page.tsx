import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { AssignmentListPage } from "@/components/staff/assignment-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Vazifalar"); } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <AssignmentListPage user={await pageUser("teacher")} base="/teacher" sp={await searchParams} />;
}
