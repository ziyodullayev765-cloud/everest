import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { WordListDetailPage } from "@/components/staff/vocab-pages";

export const metadata: Metadata = { title: "Lug‘at ro‘yxati" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await pageUser("admin", "super_admin");
  return <WordListDetailPage user={user} base="/admin" id={(await params).id} tab={(await searchParams).tab} />;
}
