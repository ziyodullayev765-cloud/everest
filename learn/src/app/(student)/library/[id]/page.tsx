import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { BookView } from "@/components/library/library-views";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Kitob"); } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookView user={await pageUser("student")} base="" id={id} />;
}
