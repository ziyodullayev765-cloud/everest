import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PeopleList } from "@/components/admin/people-list";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("O‘quvchilar"); } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <PeopleList user={await pageUser("admin", "super_admin")} kind="student" sp={await searchParams} />;
}
