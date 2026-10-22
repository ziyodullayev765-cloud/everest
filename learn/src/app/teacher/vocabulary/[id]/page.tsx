import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { WordListDetailPage } from "@/components/staff/vocab-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Lug‘at ro‘yxati"); } };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser("teacher");
  return <WordListDetailPage user={user} base="/teacher" id={(await params).id} tab={(await searchParams).tab} />;
}
