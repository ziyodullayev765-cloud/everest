import type { Metadata } from "next";
import { Backdrop } from "@/components/site/backdrop";
import { NotFoundContent } from "@/components/site/not-found-content";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.notFound.title, robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main">
      <Backdrop />
      <NotFoundContent />
    </main>
  );
}
