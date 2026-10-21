import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth/guards";
import { can } from "@/server/auth/rbac";
import { BankPage } from "@/components/staff/grading-pages";

export const metadata: Metadata = { title: "Savollar banki" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await pageUser("admin", "super_admin");
  if (!can(user, "assignments.create")) notFound();
  return <BankPage user={user} sp={await searchParams} />;
}
