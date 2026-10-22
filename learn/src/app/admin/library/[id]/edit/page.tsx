import type { Metadata } from "next";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { getBook } from "@/server/services/library";
import { PageHeader } from "@/components/ui/page";
import { BookForm } from "@/components/library/book-form";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Kitobni tahrirlash"); } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("admin", "super_admin");
  const { book: b, audio, pdf } = await orNotFound(getBook(user, id));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: `/admin/library/${id}`, label: tr("Kitob") }} title={b.title} />
      <BookForm
        id={id}
        base="/admin"
        initial={{
          title: b.title,
          author: b.author,
          level: b.level,
          category: b.category,
          description: b.description,
          status: b.status as "published",
          cover: b.coverFileId ? { id: b.coverFileId, name: "" } : null,
          pdf: pdf ? { id: pdf.id, name: pdf.name, size: pdf.size } : null,
          audio: audio.map((a) => ({ title: a.title, file: { id: a.fileId, name: a.name, size: a.size } })),
        }}
      />
    </div>
  );
}
