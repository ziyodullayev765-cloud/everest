import Link from "next/link";
import { BookOpen, CheckCircle2, Circle, Headphones, Languages, Library, PenLine, Sparkles, FileText } from "lucide-react";
import type { HomeworkItem, HomeworkKind, ItemProgress } from "@/server/db/schema";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export const KIND_ICON: Record<HomeworkKind, typeof BookOpen> = {
  reading: BookOpen,
  vocabulary: Sparkles,
  listening: Headphones,
  translation: Languages,
  tapescript: PenLine,
  writing: FileText,
  other: Circle,
};
export const KIND_TONE: Record<HomeworkKind, string> = {
  reading: "bg-info-soft text-info",
  vocabulary: "bg-violet-soft text-violet",
  listening: "bg-warning-soft text-warning",
  translation: "bg-primary-soft text-primary-soft-fg",
  tapescript: "bg-danger-soft text-danger",
  writing: "bg-success-soft text-success",
  other: "bg-surface-2 text-text-2",
};

/** Read-only homework checklist (student view, grading view). */
export function HomeworkItemsList({ items, books, progress, bookHref = (id: string) => `/library/${id}` }: { items: HomeworkItem[]; books: { id: string; title: string }[]; progress?: ItemProgress | null; bookHref?: (id: string) => string }) {
  const done = progress ? items.filter((i) => progress[i.id]?.done).length : null;
  return (
    <div>
      {done != null ? (
        <div className="mb-3 text-[13px] text-muted">
          <b className="text-text tabular">
            {done} / {items.length}
          </b>{" "}
          bajarildi
        </div>
      ) : null}
      <ol className="space-y-2">
        {items.map((it, n) => {
          const Icon = KIND_ICON[it.kind] ?? Circle;
          const book = it.bookId ? books.find((b) => b.id === it.bookId) : null;
          const p = progress?.[it.id];
          return (
            <li key={it.id} className={cn("rounded-xl border border-border p-3.5", p?.done && "bg-success-soft/40")}>
              <div className="flex items-start gap-3">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", KIND_TONE[it.kind])}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-muted">
                    {n + 1}. {t.homeworkKind[it.kind]}
                  </div>
                  <div className="text-[14.5px] font-semibold">{it.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-muted">
                    {it.range ? <span>{it.range}</span> : null}
                    {book ? (
                      <Link href={bookHref(book.id)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        <Library className="size-3.5" aria-hidden /> {book.title}
                      </Link>
                    ) : null}
                  </div>
                  {it.note ? <RichText text={it.note} className="mt-1.5 text-[13px] text-text-2" /> : null}
                  {p?.text ? <div className="mt-2 rounded-lg bg-surface px-3 py-2 text-[13.5px]"><RichText text={p.text} /></div> : null}
                </div>
                {progress ? p?.done ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Bajarilgan" /> : <Circle className="size-5 shrink-0 text-border-strong" aria-label="Bajarilmagan" /> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
