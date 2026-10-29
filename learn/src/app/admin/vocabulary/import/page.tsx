import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ImportPage } from "@/components/staff/vocab-import-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Lug‘at importi"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  return <ImportPage user={await pageUser("admin", "super_admin")} base="/admin" listId={(await searchParams).list} />;
}
