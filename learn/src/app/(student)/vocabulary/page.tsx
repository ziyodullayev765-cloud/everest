import type { Metadata } from "next";
import Link from "next/link";
import { BookA, Brain, Gamepad2, ChevronRight, Flame, Keyboard, Layers, ListChecks, Puzzle, Repeat, Sparkles, Star, TriangleAlert } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { vocabOverview } from "@/server/services/vocabulary";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VocabGoal } from "./vocab-goal";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Lug‘at"); } };

const MODES = [
  { href: "flashcard", icon: Layers, get label() { return tr("Kartochkalar"); }, get d() { return tr("So‘zni ko‘ring, eslang, o‘zingizni baholang"); } },
  { href: "choice", icon: ListChecks, get label() { return tr("EN → UZ test"); }, get d() { return tr("To‘g‘ri tarjimani tanlang"); } },
  { href: "typing", icon: Keyboard, get label() { return tr("UZ → EN yozish"); }, get d() { return tr("So‘zni inglizcha yozing (imlo)"); } },
  { href: "match", icon: Puzzle, get label() { return tr("Moslash"); }, get d() { return tr("So‘z va ma’nolarni juftlang"); } },
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
        <PageHeader title={tr("Lug‘at")} description={tr("So‘zlarni o‘rganish va takrorlash.")} />
        <Card>
          <EmptyState icon={<BookA />} title={tr("Hali lug‘at ro‘yxati berilmagan")} description={tr("Ustozingiz sizga yoki guruhingizga so‘zlar ro‘yxatini biriktirganda shu yerda paydo bo‘ladi.")} />
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={tr("Lug‘at")} description={tr("Takrorlash vaqti kelgan so‘zlar va yangi so‘zlar — oraliq takrorlash usulida.")} />

      <Card className="mb-5 overflow-hidden">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Brain className="size-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold">{tr("Bugungi mashg‘ulot")}</h2>
            <p className="mt-1 text-[14px] text-muted">
              {sessionSize
                ? [t.due ? tr("{0} ta takrorlash", t.due) : "", newToday ? tr("{0} ta yangi so‘z", newToday) : ""].filter(Boolean).join(" va ") + "."
                : t.reviewedToday
                  ? tr("Bugungi takrorlashlar bajarildi. Ertaga yangi so‘zlar ochiladi.")
                  : tr("Hozircha takrorlash vaqti kelgan so‘z yo‘q.")}
              {t.reviewedToday ? tr(" Bugun {0} marta takrorladingiz.", t.reviewedToday) : ""}
            </p>
          </div>
          {sessionSize ? (
            <LinkButton href="/vocabulary/session?mode=daily" size="lg">
              <Sparkles /> {tr("Boshlash")}
            </LinkButton>
          ) : (
            <LinkButton href="/vocabulary/session?mode=learn" variant="secondary" size="lg" className={t.newAvailable ? "" : "pointer-events-none opacity-50"}>
              {tr("Yangi so‘zlar")}
            </LinkButton>
          )}
        </CardBody>
      </Card>

      <Link href="/vocabulary/game" className="group mb-5 flex items-center gap-4 rounded-3xl bg-sun p-5 text-[#3d2a00] shadow-[0_5px_0_0_var(--sun-shadow)] transition active:translate-y-[3px] active:shadow-[0_2px_0_0_var(--sun-shadow)]">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/35">
          <Gamepad2 className="size-8" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] font-black">{tr("So‘z o‘yini")}</span>
          <span className="block text-[13.5px] font-semibold opacity-80">{tr("Tezkor test: 4 ta variant, vaqt, ball va seriya bonusi")}</span>
        </span>
        <span className="rounded-2xl bg-white px-4 py-2 text-[14px] font-black text-[#3d2a00] shadow-[0_3px_0_0_rgb(0_0_0/0.12)]">{tr("O‘ynash")}</span>
      </Link>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={tr("Takrorlash kerak")} value={t.due} icon={<Repeat />} tone="warning" hint={tr("hozir")} />
        <StatCard label={tr("O‘rganilgan")} value={t.learned} icon={<BookA />} hint={tr("{0} ta so‘zdan", t.words)} />
        <StatCard label={tr("Puxta o‘zlashtirilgan")} value={t.mastered} icon={<Flame />} tone="success" hint={tr("bir necha hafta takrorlangan")} />
        <StatCard label={tr("Qiyin so‘zlar")} value={t.difficult} icon={<TriangleAlert />} tone="danger" hint={tr("ko‘proq mashq kerak")} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title={tr("Mashq turlari")} description={tr("Takrorlash vaqti kelgan va yangi so‘zlar bilan")} />
            <CardBody className="grid gap-2 pt-3 sm:grid-cols-2">
              {MODES.map(({ href, icon: Icon, label, d }) => (
                <Link key={href} href={`/vocabulary/session?mode=daily&kind=${href}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-border-strong hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold">{label}</span>
                    <span className="block text-[12.5px] text-muted">{d}</span>
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={tr("Ro‘yxatlar")} description={tr("{0} ta ro‘yxat", o.lists.length)} />
            <ul className="divide-y divide-border">
              {o.lists.map((l) => (
                <li key={l.id}>
                  <Link href={`/vocabulary/lists/${l.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{l.title}</span>
                        {l.level ? <Badge>{l.level}</Badge> : null}
                        {l.due ? <Badge tone="warning">{tr("{0} takrorlash", l.due)}</Badge> : null}
                      </span>
                      <span className="mt-1.5 flex items-center gap-3">
                        <Progress value={l.words ? (100 * l.learned) / l.words : 0} className="max-w-56" label={tr("{0} o‘rganilgan", l.title)} />
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
            <CardHeader title={tr("Maxsus mashqlar")} />
            <CardBody className="space-y-2 pt-3">
              <LinkButton href="/vocabulary/session?mode=difficult" variant="secondary" className={`w-full justify-start ${t.difficult ? "" : "pointer-events-none opacity-50"}`}>
                <TriangleAlert /> {tr("Qiyin so‘zlar ({0})", t.difficult)}
              </LinkButton>
              <LinkButton href="/vocabulary/session?mode=favorites" variant="secondary" className={`w-full justify-start ${t.favorites ? "" : "pointer-events-none opacity-50"}`}>
                <Star /> {tr("Sevimlilar ({0})", t.favorites)}
              </LinkButton>
              <LinkButton href="/vocabulary/session?mode=review&kind=typing" variant="secondary" className={`w-full justify-start ${t.due ? "" : "pointer-events-none opacity-50"}`}>
                <Keyboard /> {tr("Faqat takrorlash, yozib")}
              </LinkButton>
            </CardBody>
          </Card>
          <VocabGoal value={o.newPerDay} />
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            {tr("So‘z bir marta to‘g‘ri topilgani bilan “puxta” hisoblanmaydi: u bir necha hafta davomida ketma-ket to‘g‘ri takrorlanishi kerak. Xato qilingan so‘z tezroq qaytadi.")}
          </p>
        </aside>
      </div>
    </div>
  );
}
