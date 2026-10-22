import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { WordListsPage } from "@/components/staff/vocab-pages";

export const metadata: Metadata = { title: "Lug‘at" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await pageUser("teacher");
  return <WordListsPage user={user} base="/teacher" sp={await searchParams} />;
}
