import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageUser } from "@/server/auth/guards";
import { can } from "@/server/auth/rbac";
import { BankPage } from "@/components/staff/grading-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Savollar banki"); } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await pageUser("admin", "super_admin");
  if (!can(user, "assignments.create")) notFound();
  return <BankPage user={user} sp={await searchParams} />;
}
