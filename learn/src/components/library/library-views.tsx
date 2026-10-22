import Link from "next/link";
import { BookOpen, Headphones, Library } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { getBook, listBooks } from "@/server/services/library";
import { orNotFound } from "@/server/auth/guards";
import { BOOK_CATEGORIES } from "@/server/db/schema";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { AudioPlayer } from "@/components/app/media";
import { PdfOpenButton } from "@/components/app/pdf-reader";
import { SaveOffline } from "./save-offline";
import { tr } from "@/lib/i18n/tr";

export function BookCover({ coverFileId, title, className }: { coverFileId: string | null; title: string; className?: string }) {
  return coverFileId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${coverFileId}`} alt={title} loading="lazy" className={cn("aspect-[3/4] w-full rounded-xl border border-border bg-surface-2 object-cover", className)} />
  ) : (
    <div className={cn("grid aspect-[3/4] w-full place-items-center rounded-xl border border-border bg-gradient-to-br from-primary-soft to-surface-2 p-3 text-center", className)}>
      <span>
        <BookOpen className="mx-auto mb-2 size-7 text-primary" aria-hidden />
        <span className="line-clamp-3 text-[13px] font-bold text-text-2">{title}</span>
      </span>
    </div>
  );
}

export async function LibraryGrid({ user, base, sp, manage }: { user: SessionUser; base: string; sp: { category?: string; q?: string }; manage?: boolean }) {
  const books = await listBooks(user, { all: manage, category: sp.category, q: sp.q });
  const cats = [["", tr("Barchasi")], ...BOOK_CATEGORIES.map((c) => [c, t.bookCategory[c]])];
  return (
    <>
      <PageHeader title={tr("Kutubxona")} description={tr("Kitoblar, PDF fayllar va audio yozuvlar.")} actions={manage ? <LinkButton href={`${base}/library/new`}>{tr("Kitob qo‘shish")}</LinkButton> : null} />
      <nav className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={tr("Turkumlar")}>
        {cats.map(([k, l]) => (
          <Link key={k} href={k ? `${base}/library?category=${k}` : `${base}/library`} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", (sp.category ?? "") === k ? "border-primary bg-primary-soft text-primary-soft-fg" : "border-border bg-surface text-text-2 hover:bg-surface-2")}>
            {l}
          </Link>
        ))}
      </nav>
      {books.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {books.map((b) => (
            <Link key={b.id} href={`${base}/library/${b.id}${manage ? "/edit" : ""}`} className="group animate-fade-up">
              <div className="relative">
                <BookCover coverFileId={b.coverFileId} title={b.title} className="transition group-hover:-translate-y-0.5 group-hover:shadow-pop" />
                {manage && b.status !== "published" ? <Badge className="absolute top-2 left-2">{b.status === "draft" ? tr("Qoralama") : tr("Arxiv")}</Badge> : null}
              </div>
              <div className="mt-2 line-clamp-2 text-[13.5px] leading-snug font-bold">{b.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <span>{t.bookCategory[b.category as "other"] ?? b.category}</span>
                {b.level ? <span>· {b.level}</span> : null}
                {b.audioCount ? (
                  <span className="inline-flex items-center gap-0.5">
                    · <Headphones className="size-3" aria-hidden /> {b.audioCount}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Library />} title={tr("Kitoblar yo‘q")} description={manage ? tr("Birinchi kitobni qo‘shing: muqova, PDF va audio.") : tr("Administrator kitob qo‘shganda shu yerda ko‘rinadi.")} action={manage ? <LinkButton href={`${base}/library/new`}>{tr("Kitob qo‘shish")}</LinkButton> : null} />
        </Card>
      )}
    </>
  );
}

export async function BookView({ user, base, id, manage }: { user: SessionUser; base: string; id: string; manage?: boolean }) {
  const { book: b, audio, pdf } = await orNotFound(getBook(user, id));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={{ href: `${base}/library`, label: tr("Kutubxona") }} title={b.title} description={[b.author, b.level].filter(Boolean).join(" · ") || undefined} actions={manage ? <LinkButton href={`${base}/library/${b.id}/edit`} variant="secondary">{tr("Tahrirlash")}</LinkButton> : null} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <div className="mx-auto w-44 md:w-full">
          <BookCover coverFileId={b.coverFileId} title={b.title} />
        </div>
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">{t.bookCategory[b.category as "other"] ?? b.category}</Badge>
            {b.level ? <Badge>{b.level}</Badge> : null}
          </div>
          {b.description ? <RichText text={b.description} className="text-[14.5px] text-text-2" /> : null}
          {pdf ? (
            <div className="flex flex-wrap gap-2">
              <PdfOpenButton file={{ id: pdf.id, name: pdf.name, size: pdf.size }} withDownload />
            </div>
          ) : (
            <p className="text-[13.5px] text-muted">{tr("Bu kitobning PDF fayli yuklanmagan.")}</p>
          )}
          {!manage ? <SaveOffline files={[...(pdf ? [{ id: pdf.id, size: pdf.size }] : []), ...audio.map((a) => ({ id: a.fileId, size: a.size }))]} /> : null}
          {audio.length ? (
            <Card>
              <CardHeader title={tr("Audio")} icon={<Headphones />} description={tr("{0} ta trek", audio.length)} />
              <CardBody className="space-y-2 pt-3">
                {audio.map((a) => (
                  <AudioPlayer key={a.id} file={{ id: a.fileId, name: a.name, size: a.size }} title={a.title} />
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
