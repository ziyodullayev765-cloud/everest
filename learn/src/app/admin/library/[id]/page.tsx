import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { BookView } from "@/components/library/library-views";

export const metadata: Metadata = { title: "Kitob" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookView user={await pageUser("admin", "super_admin")} base="/admin" id={id} manage />;
}
