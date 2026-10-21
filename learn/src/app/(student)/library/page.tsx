import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { LibraryGrid } from "@/components/library/library-views";

export const metadata: Metadata = { title: "Kutubxona" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  return <LibraryGrid user={await pageUser("student")} base="" sp={await searchParams} />;
}
