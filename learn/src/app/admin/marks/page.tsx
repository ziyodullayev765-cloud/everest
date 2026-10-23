import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { MarksPage } from "@/components/staff/marks-page";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Dars baholari"); } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <MarksPage user={await pageUser("admin", "super_admin")} base="/admin" sp={await searchParams} />;
}
