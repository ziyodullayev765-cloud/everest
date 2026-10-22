import type { Metadata } from "next";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { studentWordList } from "@/server/services/vocabulary";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { BookA, Gamepad2, Layers, Puzzle, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { WordFlags } from "./word-flags";

export const metadata: Metadata = { title: "So‘zlar ro‘yxati" };

const STATE: Record<string, { label: string; tone: "neutral" | "primary" | "success" | "warning" }> = {
  learning: { label: "O‘rganilmoqda", tone: "warning" },
  review: { label: "Takrorlanmoqda", tone: "primary" },
  mastered: { label: "Puxta", tone: "success" },
};

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("student");
  const { list, words } = await orNotFound(studentWordList(user, id));
  const now = Date.now();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: "/vocabulary", label: "Lug‘at" }}
        title={list.title}
        description={[list.level, list.topic, `${words.length} ta so‘z`].filter(Boolean).join(" · ")}
        actions={
          <>
            <LinkButton href={`/vocabulary/session?mode=daily&list=${id}`}>
              <Sparkles /> Mashq qilish
            </LinkButton>
            <LinkButton href={`/vocabulary/session?mode=learn&list=${id}&kind=flashcard`} variant="secondary">
              <Layers /> Kartochkalar
            </LinkButton>
            <LinkButton href={`/vocabulary/session?mode=learn&list=${id}&kind=match`} variant="secondary">
              <Puzzle /> Moslash
            </LinkButton>
            <LinkButton href={`/vocabulary/game?list=${id}`} variant="secondary">
              <Gamepad2 /> O‘yin
            </LinkButton>
          </>
        }
      />
      {list.description ? <p className="mb-5 max-w-2xl text-[14.5px] text-text-2">{list.description}</p> : null}
      {words.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {words.map((w) => {
              const st = w.progress && w.progress.reps > 0 ? STATE[w.progress.state] : w.progress ? STATE.learning : null;
              const due = w.progress && w.progress.dueAt.getTime() <= now;
              return (
                <li key={w.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[15.5px] font-bold">{w.english}</span>
                      {w.phonetic ? <span className="text-[12.5px] text-muted">{w.phonetic}</span> : null}
                      {w.partOfSpeech ? <span className="text-[12px] text-muted italic">{w.partOfSpeech}</span> : null}
                    </div>
                    <div className="text-[14px] text-text-2">{w.uzbek}</div>
                    {w.example ? <div className="mt-1 text-[13px] text-muted italic">{w.example}</div> : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge>Yangi</Badge>}
                      {due ? <Badge tone="warning">Takrorlash vaqti</Badge> : w.progress?.reps ? <span className="text-[11.5px] text-muted">keyingi: {formatDate(w.progress.dueAt)}</span> : null}
                    </div>
                  </div>
                  <WordFlags wordId={w.id} audioFileId={w.audioFileId} english={w.english} favorite={!!w.progress?.favorite} difficult={!!w.progress?.difficult} />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<BookA />} title="Ro‘yxat bo‘sh" />
        </Card>
      )}
    </div>
  );
}
