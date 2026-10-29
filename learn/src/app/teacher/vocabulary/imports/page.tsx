import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ImportsPage } from "@/components/staff/vocab-import-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Import tarixi"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <ImportsPage user={await pageUser("teacher")} base="/teacher" sp={await searchParams} />;
}
