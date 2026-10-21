import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PeopleList } from "@/components/admin/people-list";

export const metadata: Metadata = { title: "O‘quvchilar" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <PeopleList user={await pageUser("admin", "super_admin")} kind="student" sp={await searchParams} />;
}
