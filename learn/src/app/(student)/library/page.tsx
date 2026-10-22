import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { LibraryGrid } from "@/components/library/library-views";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Kutubxona"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  return <LibraryGrid user={await pageUser("student")} base="" sp={await searchParams} />;
}
