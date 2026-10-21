import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { AssignmentListPage } from "@/components/staff/assignment-pages";

export const metadata: Metadata = { title: "Vazifalar" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <AssignmentListPage user={await pageUser("admin", "super_admin")} base="/admin" sp={await searchParams} />;
}
