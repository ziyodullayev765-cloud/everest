import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page";
import { BookForm } from "@/components/library/book-form";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Kitob qo‘shish"); } };

export default async function Page() {
  await pageUser("admin", "super_admin");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: "/admin/library", label: tr("Kutubxona") }} title={tr("Kitob qo‘shish")} />
      <BookForm id={null} base="/admin" initial={{ title: "", author: "", level: "", category: "reading", description: "", status: "published", cover: null, pdf: null, audio: [] }} />
    </div>
  );
}
