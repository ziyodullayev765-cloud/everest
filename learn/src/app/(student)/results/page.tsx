import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BarChart3, BookA, CheckCircle2, Clock, Minus, Sparkles, Star, Target, TrendingUp } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { studentResults } from "@/server/services/analytics";
import { ownProfile } from "@/server/services/users";
import { addDays } from "@/lib/gamification";
import { localDay } from "@/lib/dates";
import { cn, fmtPercent } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { DailyBars, TrendLine } from "@/components/student/charts";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Natijalarim"); } };

const RANGES = [
  { k: "7", get label() { return tr("7 kun"); } },
  { k: "30", get label() { return tr("30 kun"); } },
  { k: "90", get label() { return tr("3 oy"); } },
  { k: "365", get label() { return tr("1 yil"); } },
];

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const user = await pageUser("student");
  const sp = await searchParams;
  const days = RANGES.some((x) => x.k === sp.r) ? Number(sp.r) : 30;
  const today = localDay(new Date());
  const [r, profile] = await Promise.all([studentResults(user.id, { from: addDays(today, -(days - 1)), to: today }), ownProfile(user.id)]);
  const { thisWeek, lastWeek } = r.compare;
  const empty = r.gradedCount === 0 && r.completedVsAssigned.completed === 0 && r.daily.every((d) => d.tasks + d.quizzes + d.words === 0);
  const cva = r.completedVsAssigned;

  return (
    <>
      <PageHeader
        title={tr("Natijalarim")}
        description={tr("Shaxsiy o‘sishingiz. Bu ma’lumotlar faqat sizga va ustozlaringizga ko‘rinadi.")}
        actions={
          <nav className="inline-flex rounded-xl border border-border bg-surface-2 p-1" aria-label={tr("Davr")}>
            {RANGES.map((x) => (
              <Link key={x.k} href={`/results?r=${x.k}`} aria-current={String(days) === x.k ? "true" : undefined} className={cn("rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted", String(days) === x.k && "bg-surface text-text shadow-soft")}>
                {x.label}
              </Link>
            ))}
          </nav>
        }
      />

      {/* Weekly report */}
      <Card className="mb-6">
        <CardHeader title={tr("Haftalik hisobot")} description={tr("Joriy hafta va o‘tgan hafta (dushanbadan boshlab)")} icon={<TrendingUp />} />
        <CardBody className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-5">
          <Compare label={tr("Vazifalar")} now={thisWeek.tasks} prev={lastWeek.tasks} />
          <Compare label={tr("Quizlar")} now={thisWeek.quizzes} prev={lastWeek.quizzes} />
          <Compare label={tr("So‘z takrorlash")} now={thisWeek.words} prev={lastWeek.words} />
          <Compare label={tr("O‘rtacha baho")} now={thisWeek.average} prev={lastWeek.average} pct />
          <Compare label={tr("Quiz aniqligi")} now={thisWeek.accuracy} prev={lastWeek.accuracy} pct />
        </CardBody>
        <p className="px-5 pb-5 text-[13.5px] text-muted">{summarySentence(thisWeek, lastWeek)}</p>
      </Card>

      {empty ? (
        <Card>
          <EmptyState icon={<BarChart3 />} title={tr("Bu davrda hali ma’lumot yo‘q")} description={tr("Vazifa va quizlarni topshirganingizdan so‘ng grafiklar avtomatik to‘ladi.")} action={<LinkButton href="/assignments">{tr("Vazifalarga o‘tish")}</LinkButton>} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={tr("Vazifalar bajarilishi")} value={`${cva.completed} / ${cva.assigned}`} icon={<CheckCircle2 />} tone="info" hint={cva.assigned ? tr("{0}% · shu davr", Math.round((100 * cva.completed) / cva.assigned)) : tr("shu davrda vazifa yo‘q")} />
            <StatCard label={tr("Quiz o‘rtachasi")} value={fmtPercent(r.quizAverage)} icon={<Target />} tone="violet" hint={tr("{0} ta urinish", r.quizCount)} />
            <StatCard label={tr("Rasmiy baholar")} value={fmtPercent(r.averageGrade)} icon={<Star />} hint={tr("{0} ta baho", r.gradedCount)} />
            <StatCard label={tr("Muddatida topshirish")} value={fmtPercent(r.punctuality.rate)} icon={<Clock />} tone="success" hint={tr("{0} muddatida · {1} kech", r.punctuality.onTime, r.punctuality.late)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={tr("Yo‘nalishlar bo‘yicha")} description={tr("Rasmiy baho va mashq natijasi alohida")} />
              <CardBody className="pt-3">
                {r.areas.length ? (
                  <ul className="space-y-3.5">
                    {r.areas.map((a) => (
                      <li key={a.key}>
                        <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-[13.5px]">
                          <span className="font-semibold">{a.label}</span>
                          <span className="text-muted tabular">
                            {a.official != null ? tr("baho {0}%", Math.round(a.official)) : tr("baho yo‘q")}
                            {a.practice != null ? tr(" · mashq {0}%", Math.round(a.practice)) : ""}
                          </span>
                        </div>
                        <Progress value={a.official ?? a.practice ?? 0} tone={(a.official ?? a.practice ?? 0) >= 60 ? "primary" : "warning"} label={a.label} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-[13.5px] text-muted">{tr("Bu davrda baholangan ish yoki mashq yo‘q.")}</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={tr("Vaqt bo‘yicha natija")} description={tr("Haftalik o‘rtacha baho")} />
              <CardBody>{r.overTime.length > 1 ? <TrendLine data={r.overTime} /> : <p className="py-8 text-center text-[13.5px] text-muted">{tr("Trend uchun kamida ikki haftalik baho kerak.")}</p>}</CardBody>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title={tr("Lug‘at")} icon={<BookA />} action={<LinkButton href="/vocabulary" variant="ghost" size="sm">{tr("Ochish")}</LinkButton>} />
              <CardBody className="grid grid-cols-2 gap-3 pt-3 text-[13px]">
                <Mini label={tr("O‘rganilgan")} value={r.vocab.learned} />
                <Mini label={tr("Puxta")} value={r.vocab.mastered} />
                <Mini label={tr("Takrorlash kerak")} value={r.vocab.due} />
                <Mini label={tr("Aniqlik (davr)")} value={r.vocab.accuracy == null ? "—" : `${Math.round(r.vocab.accuracy)}%`} />
                <p className="col-span-2 text-[12px] text-muted">{tr("Shu davrda {0} marta takrorlandi.", r.vocab.reviews)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={tr("So‘nggi baholar")} icon={<Star />} action={<LinkButton href="/grades" variant="ghost" size="sm">{tr("Barchasi")}</LinkButton>} />
              <CardBody className="pt-2">
                {r.recentGrades.length ? (
                  <ul className="divide-y divide-border">
                    {r.recentGrades.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                        <span className="min-w-0 truncate">{g.title}</span>
                        <span className="shrink-0 font-bold tabular">{Math.round(g.percent)}%{g.status !== "final" ? <span className="ml-1 text-[11px] font-normal text-muted">{tr("dastlabki")}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-[13px] text-muted">{tr("Hali baho yo‘q.")}</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={tr("O‘tkazib yuborilgan")} icon={<Clock />} description={tr("Muddati o‘tgan, topshirilmagan")} />
              <CardBody className="pt-2">
                {r.missed.length ? (
                  <ul className="divide-y divide-border">
                    {r.missed.slice(0, 6).map((a) => (
                      <li key={a.id}>
                        <Link href={a.questionCount ? `/quizzes/${a.id}` : `/assignments/${a.id}`} className="block truncate py-2 text-[13.5px] hover:text-primary">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-[13px] text-muted">{tr("Muddati o‘tgan ish yo‘q.")}</p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title={tr("Kunlik faollik")} description={tr("Topshirilgan vazifalar, yakunlangan quizlar va so‘z takrorlash")} />
            <CardBody>
              <DailyBars data={r.daily} />
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title={tr("Kuchli tomonlar")} icon={<Sparkles />} description={tr("O‘rtacha 80% va undan yuqori")} />
              <CardBody className="pt-3">
                {r.strong.length ? <AreaList items={r.strong} tone="primary" /> : <p className="text-[13.5px] text-muted">{tr("Hozircha yo‘q — davom eting!")}</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={tr("Ko‘proq mashq qiling")} icon={<Target />} description={tr("O‘rtacha 60% dan past")} />
              <CardBody className="pt-3">
                {r.needsPractice.length ? <AreaList items={r.needsPractice} tone="warning" /> : <p className="text-[13.5px] text-muted">{r.vocab.due ? tr("Lug‘atda {0} ta so‘z takrorlashni kutmoqda.", r.vocab.due) : tr("Barcha yo‘nalishlarda yaxshi natija.")}</p>}
              </CardBody>
            </Card>
            <Card id="goals">
              <CardHeader title={tr("Shaxsiy maqsadlar")} action={<LinkButton href="/profile/settings#goals" variant="ghost" size="sm">{tr("Sozlash")}</LinkButton>} />
              <CardBody className="space-y-4 pt-3 text-[13.5px]">
                <Goal label={tr("Haftalik vazifalar")} value={thisWeek.tasks + thisWeek.quizzes} target={profile.weeklyTaskGoal} />
                <p className="text-[12.5px] text-muted">{tr("Maqsadni profilingizda o‘zgartirishingiz mumkin.")}</p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function summarySentence(a: { tasks: number; quizzes: number; words: number; average: number | null }, b: { tasks: number; quizzes: number; words: number; average: number | null }) {
  const now = a.tasks + a.quizzes;
  const prev = b.tasks + b.quizzes;
  if (now === 0 && prev === 0 && !a.words && !b.words) return tr("Bu va o‘tgan haftada faollik yo‘q. Bugun kichik qadamdan boshlang!");
  if (now > prev) return tr("Bu hafta o‘tgan haftadan {0} ta ko‘proq ish bajardingiz — zo‘r sur’at!", now - prev);
  if (now === prev) return tr("Barqaror sur’at: o‘tgan hafta bilan bir xil faollik.");
  return tr("O‘tgan haftada {0} ta ish bor edi. Hafta hali tugamadi — maqsadingizga yetishingiz mumkin.", prev);
}

function Compare({ label, now, prev, pct }: { label: string; now: number | null; prev: number | null; pct?: boolean }) {
  const delta = now != null && prev != null ? now - prev : null;
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl bg-surface-2 px-4 py-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-bold tabular">{now == null ? "—" : pct ? `${Math.round(now)}%` : now}</span>
        <span className={cn("inline-flex items-center text-[12px] font-semibold tabular", delta == null || delta === 0 ? "text-muted" : delta > 0 ? "text-success" : "text-text-2")}>
          <Icon className="size-3.5" aria-hidden />
          {delta == null ? "" : pct ? `${Math.abs(Math.round(delta))}%` : Math.abs(delta)}
        </span>
      </div>
      <div className="text-[11.5px] text-muted">{tr("o‘tgan hafta:")} {prev == null ? "—" : pct ? `${Math.round(prev)}%` : prev}</div>
    </div>
  );
}

const AREA_HREF: Record<string, string> = { grammar: "/grammar", reading: "/reading", listening: "/listening", vocabulary: "/vocabulary" };

function AreaList({ items, tone }: { items: { key: string; label: string; official: number | null; practice: number | null }[]; tone: "primary" | "warning" }) {
  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const v = s.official ?? s.practice ?? 0;
        return (
          <li key={s.key}>
            <div className="mb-1 flex justify-between text-[13.5px]">
              {AREA_HREF[s.key] ? (
                <Link href={AREA_HREF[s.key]} className="font-semibold hover:text-primary">
                  {s.label}
                </Link>
              ) : (
                <span className="font-semibold">{s.label}</span>
              )}
              <span className="text-muted tabular">{Math.round(v)}%</span>
            </div>
            <Progress value={v} tone={tone} label={s.label} />
          </li>
        );
      })}
    </ul>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="text-[18px] font-bold tabular">{value}</div>
    </div>
  );
}

function Goal({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="font-semibold">{label}</span>
        <span className="text-muted tabular">
          {value} / {target}
        </span>
      </div>
      <Progress value={(value / target) * 100} label={label} />
    </div>
  );
}
