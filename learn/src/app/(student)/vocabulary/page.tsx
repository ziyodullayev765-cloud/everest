import type { Metadata } from "next";
import Link from "next/link";
import { BookA, Brain, ChevronRight, Flame, Keyboard, Layers, ListChecks, Puzzle, Repeat, Sparkles, Star, TriangleAlert } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { vocabOverview } from "@/server/services/vocabulary";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VocabGoal } from "./vocab-goal";

export const metadata: Metadata = { title: "Lug‘at" };

const MODES = [
  { href: "flashcard", icon: Layers, label: "Kartochkalar", d: "So‘zni ko‘ring, eslang, o‘zingizni baholang" },
  { href: "choice", icon: ListChecks, label: "EN → UZ test", d: "To‘g‘ri tarjimani tanlang" },
  { href: "typing", icon: Keyboard, label: "UZ → EN yozish", d: "So‘zni inglizcha yozing (imlo)" },
  { href: "match", icon: Puzzle, label: "Moslash", d: "So‘z va ma’nolarni juftlang" },
] as const;

export default async function VocabularyPage() {
  const user = await pageUser("student");
  const o = await vocabOverview(user);
  const t = o.totals;
  const newToday = Math.max(0, Math.min(o.newPerDay - t.newToday, t.newAvailable));
  const sessionSize = t.due + newToday;

  if (!o.lists.length)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Lug‘at" description="So‘zlarni o‘rganish va takrorlash." />
        <Card>
          <EmptyState icon={<BookA />} title="Hali lug‘at ro‘yxati berilmagan" description="Ustozingiz sizga yoki guruhingizga so‘zlar ro‘yxatini biriktirganda shu yerda paydo bo‘ladi." />
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Lug‘at" description="Takrorlash vaqti kelgan so‘zlar va yangi so‘zlar — oraliq takrorlash usulida." />

      <Card className="mb-5 overflow-hidden">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Brain className="size-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-semibold">Bugungi mashg‘ulot</h2>
            <p className="mt-1 text-[14px] text-muted">
              {sessionSize
                ? `${t.due} ta takrorlash${newToday ? ` va ${newToday} ta yangi so‘z` : ""}.`
                : t.reviewedToday
                  ? "Bugungi takrorlashlar bajarildi. Ertaga yangi so‘zlar ochiladi."
                  : "Hozircha takrorlash vaqti kelgan so‘z yo‘q."}
              {t.reviewedToday ? ` Bugun ${t.reviewedToday} marta takrorladingiz.` : ""}
            </p>
          </div>
          {sessionSize ? (
            <LinkButton href="/vocabulary/session?mode=daily" size="lg">
              <Sparkles /> Boshlash
            </LinkButton>
          ) : (
            <LinkButton href="/vocabulary/session?mode=learn" variant="secondary" size="lg" className={t.newAvailable ? "" : "pointer-events-none opacity-50"}>
              Yangi so‘zlar
            </LinkButton>
          )}
        </CardBody>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Takrorlash kerak" value={t.due} icon={<Repeat />} tone="warning" hint="hozir" />
        <StatCard label="O‘rganilgan" value={t.learned} icon={<BookA />} hint={`${t.words} ta so‘zdan`} />
        <StatCard label="Puxta o‘zlashtirilgan" value={t.mastered} icon={<Flame />} tone="success" hint="bir necha hafta takrorlangan" />
        <StatCard label="Qiyin so‘zlar" value={t.difficult} icon={<TriangleAlert />} tone="danger" hint="ko‘proq mashq kerak" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Mashq turlari" description="Takrorlash vaqti kelgan va yangi so‘zlar bilan" />
            <CardBody className="grid gap-2 pt-3 sm:grid-cols-2">
              {MODES.map(({ href, icon: Icon, label, d }) => (
                <Link key={href} href={`/vocabulary/session?mode=daily&kind=${href}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-border-strong hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">{label}</span>
                    <span className="block text-[12.5px] text-muted">{d}</span>
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Ro‘yxatlar" description={`${o.lists.length} ta ro‘yxat`} />
            <ul className="divide-y divide-border">
              {o.lists.map((l) => (
                <li key={l.id}>
                  <Link href={`/vocabulary/lists/${l.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{l.title}</span>
                        {l.level ? <Badge>{l.level}</Badge> : null}
                        {l.due ? <Badge tone="warning">{l.due} takrorlash</Badge> : null}
                      </span>
                      <span className="mt-1.5 flex items-center gap-3">
                        <Progress value={l.words ? (100 * l.learned) / l.words : 0} className="max-w-56" label={`${l.title} o‘rganilgan`} />
                        <span className="shrink-0 text-[12px] text-muted tabular">
                          {l.learned}/{l.words}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="Maxsus mashqlar" />
            <CardBody className="space-y-2 pt-3">
              <LinkButton href="/vocabulary/session?mode=difficult" variant="secondary" className={`w-full justify-start ${t.difficult ? "" : "pointer-events-none opacity-50"}`}>
                <TriangleAlert /> Qiyin so‘zlar ({t.difficult})
              </LinkButton>
              <LinkButton href="/vocabulary/session?mode=favorites" variant="secondary" className={`w-full justify-start ${t.favorites ? "" : "pointer-events-none opacity-50"}`}>
                <Star /> Sevimlilar ({t.favorites})
              </LinkButton>
              <LinkButton href="/vocabulary/session?mode=review&kind=typing" variant="secondary" className={`w-full justify-start ${t.due ? "" : "pointer-events-none opacity-50"}`}>
                <Keyboard /> Faqat takrorlash, yozib
              </LinkButton>
            </CardBody>
          </Card>
          <VocabGoal value={o.newPerDay} />
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            So‘z bir marta to‘g‘ri topilgani bilan “puxta” hisoblanmaydi: u bir necha hafta davomida ketma-ket to‘g‘ri takrorlanishi kerak. Xato qilingan so‘z tezroq qaytadi.
          </p>
        </aside>
      </div>
    </div>
  );
}
