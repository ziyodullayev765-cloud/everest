import type { Metadata } from "next";
import { Backdrop } from "@/components/site/backdrop";
import { NotFoundContent } from "@/components/site/not-found-content";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.notFound.title, robots: { index: false } };
}

export default function NotFound() {
  return (
    <main id="main">
      <Backdrop />
      <NotFoundContent />
    </main>
  );
}
