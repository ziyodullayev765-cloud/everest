import type { Metadata } from "next";
import Link from "next/link";
import { Award, CheckCircle2, Clock3, Flame, Gauge, Hourglass, Star, Target, Trophy, Zap, ChevronRight, CalendarRange } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { studentDashboard } from "@/server/services/analytics";
import { ownProfile } from "@/server/services/users";
import { getSettings } from "@/server/services/settings";
import { ACHIEVEMENTS } from "@/lib/gamification";
import { formatDateTime, formatLongToday, remaining } from "@/lib/dates";
import { cn, fmtNumber, fmtPercent } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/page";
import { EmptyState, Progress, Ring } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { AssignmentBoard } from "@/components/student/assignment-board";
import { hrefFor } from "@/components/student/assignment-card";
import { WeeklyActivityChart } from "@/components/student/charts";
import { AchievementIcon } from "@/components/student/achievement-icon";

export const metadata: Metadata = { title: "Bosh sahifa" };

const MOTIVATION = [
  "Kichik qadamlar katta natijalarga olib keladi.",
  "Bugungi harakat — ertangi ishonch.",
  "Har bir savol sizni maqsadga yaqinlashtiradi.",
  "Izchillik — iste’doddan kuchliroq.",
  "Xato qilish — o‘rganishning bir qismi.",
  "Bir soatlik diqqat bir kunlik tashvishdan yaxshi.",
  "Siz o‘ylaganingizdan ham ko‘proq narsaga qodirsiz.",
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Tashkent" }).format(new Date()));
  return h < 11 ? t.greeting.morning : h < 18 ? t.greeting.day : t.greeting.evening;
}

export default async function StudentHome() {
  const user = await pageUser("student");
  const [profile, settings] = await Promise.all([ownProfile(user.id), getSettings()]);
  const d = await studentDashboard(user.id, profile.weeklyTaskGoal);
  const gamify = settings.gamification.enabled && profile.gamificationEnabled;
  const firstName = user.displayName.split(" ")[0];
  const dayIdx = Math.floor(Date.now() / 86400000) % MOTIVATION.length;
  const todayCount = d.todays.length;
  const nextDue = d.upcoming[0];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative animate-fade-up overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-7">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_120%_at_100%_0%,var(--primary-soft),transparent_60%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted first-letter:uppercase">{formatLongToday()}</p>
            <h1 className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.025em] text-text sm:text-[28px]">
              {greeting()}, {firstName}!
            </h1>
            <p className="mt-1.5 text-[14px] text-muted">{MOTIVATION[dayIdx]}</p>
            <p className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-[13.5px] text-text-2">
              <CalendarRange className="size-4 text-primary" aria-hidden />
              {todayCount ? (
                <span>
                  Bugun muddati tugaydigan <b className="text-text">{todayCount} ta</b> vazifa bor
                  {nextDue ? <>, eng yaqini {remaining(nextDue.dueAt!).text.replace(" qoldi", "")}dan keyin</> : null}.
                </span>
              ) : d.stats.pending ? (
                <span>
                  Bugungi muddatlar yo‘q. Bajarilishi kerak: <b className="text-text">{d.stats.pending} ta</b>.
                </span>
              ) : (
                <span>Barcha vazifalar bajarilgan — ajoyib!</span>
              )}
            </p>
          </div>
          {gamify ? (
            <div className="flex shrink-0 gap-2">
              <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-soft">
                <Flame className={cn("size-5", d.stats.streak ? "text-warning" : "text-muted")} aria-hidden />
                <div className="leading-tight">
                  <div className="text-[17px] font-semibold tabular">{d.stats.streak}</div>
                  <div className="text-[11.5px] text-muted">kunlik seriya</div>
                </div>
              </div>
              <Link href="/achievements" className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-soft hover:border-border-strong">
                <Zap className="size-5 text-primary" aria-hidden />
                <div className="leading-tight">
                  <div className="text-[17px] font-semibold tabular">{d.game.level.level}-daraja</div>
                  <div className="text-[11.5px] text-muted tabular">{fmtNumber(d.game.xp)} XP</div>
                </div>
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Ko‘rsatkichlar" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Bajarilgan" value={d.stats.completed} icon={<CheckCircle2 />} hint="jami vazifalar" />
        <StatCard label="Kutilmoqda" value={d.stats.pending} icon={<Hourglass />} tone="warning" hint={d.overdue.length ? `${d.overdue.length} tasi muddati o‘tgan` : "barchasi muddatida"} />
        <StatCard label="O‘rtacha baho" value={fmtPercent(d.stats.averageGrade)} icon={<Star />} tone="info" hint={d.stats.gradedCount ? `${d.stats.gradedCount} ta baho asosida` : "hali baho yo‘q"} />
        <StatCard label="Quiz aniqligi" value={fmtPercent(d.stats.quizAccuracy)} icon={<Target />} tone="violet" hint="to‘g‘ri javoblar ulushi" />
        <StatCard label="Haftalik maqsad" value={`${d.stats.weeklyProgress}%`} icon={<Gauge />} tone="success" hint={`${d.stats.weekDone} / ${d.stats.weeklyTaskGoal} ta`} />
        <StatCard label="O‘qish seriyasi" value={`${d.stats.streak} kun`} icon={<Flame />} tone="warning" hint={`eng yaxshisi: ${d.stats.bestStreak} kun`} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Assignments */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Vazifalarim</h2>
              <Link href="/assignments" className="inline-flex items-center text-[13px] font-medium text-primary hover:underline">
                Barchasi <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
            <AssignmentBoard rows={d.all} showSearch={false} narrow emptyText="O‘qituvchingiz vazifa e’lon qilganda shu yerda ko‘rinadi." />
          </section>

          {/* Weekly activity */}
          <Card>
            <CardHeader title="Haftalik faollik" description="So‘nggi 7 kun: bajarilgan ishlar va o‘rtacha ball" />
            <CardBody className="pt-3">
              {d.hasAnyActivity ? (
                <>
                  <WeeklyActivityChart data={d.week} />
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
                    <Legend color="var(--chart-1)" label="Vazifalar" />
                    <Legend color="var(--chart-2)" label="Quizlar" />
                    <Legend color="var(--chart-3)" label="O‘rtacha ball, %" line />
                  </div>
                </>
              ) : (
                <EmptyState icon={<CalendarRange />} title="Faollik hali yo‘q" description="Birinchi vazifani topshirganingizdan so‘ng haftalik grafik shu yerda paydo bo‘ladi." className="py-6" />
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Haftalik maqsad" description="Har dushanba yangilanadi" action={<LinkButton href="/profile#goals" variant="ghost" size="sm">O‘zgartirish</LinkButton>} />
            <CardBody className="flex items-center gap-4">
              <Ring value={d.stats.weeklyProgress} size={84} stroke={8}>
                <span className="text-[17px] font-semibold tabular">{d.stats.weeklyProgress}%</span>
              </Ring>
              <div className="text-[13.5px] text-muted">
                Bu hafta <b className="text-text">{d.stats.weekDone}</b> ta ish bajarildi. Maqsad — <b className="text-text">{d.stats.weeklyTaskGoal}</b> ta.
                {d.stats.weekDone < d.stats.weeklyTaskGoal ? <> Yana {d.stats.weeklyTaskGoal - d.stats.weekDone} ta qoldi.</> : <> Maqsadga erishdingiz!</>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Yaqin muddatlar" icon={<Clock3 />} />
            <CardBody className="pt-3">
              {d.upcoming.length ? (
                <ol className="space-y-1">
                  {d.upcoming.map((a) => {
                    const r = remaining(a.dueAt!);
                    const level = r.hours < 24 ? "danger" : r.hours < 72 ? "warning" : "primary";
                    return (
                      <li key={a.id}>
                        <Link href={hrefFor(a)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                          <span className={cn("h-9 w-1 shrink-0 rounded-full", level === "danger" ? "bg-danger" : level === "warning" ? "bg-warning" : "bg-primary/50")} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-text">{a.title}</span>
                            <span className="block text-[12px] text-muted">
                              {a.subjectName} · {formatDateTime(a.dueAt!)}
                            </span>
                          </span>
                          <span className={cn("shrink-0 text-[12px] font-medium", level === "danger" ? "text-danger" : level === "warning" ? "text-warning" : "text-muted")} suppressHydrationWarning>
                            {r.text.replace(" qoldi", "")}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="px-2 py-4 text-center text-[13.5px] text-muted">Yaqin kunlarda muddat yo‘q.</p>
              )}
            </CardBody>
          </Card>

          {gamify ? (
            <Card>
              <CardHeader title="Yutuqlar" icon={<Trophy />} action={<LinkButton href="/achievements" variant="ghost" size="sm">Barchasi</LinkButton>} />
              <CardBody className="pt-3">
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-[12.5px] text-muted tabular">
                    <span>{d.game.level.level}-daraja</span>
                    <span>
                      {fmtNumber(d.game.xp)} / {fmtNumber(d.game.level.next)} XP
                    </span>
                  </div>
                  <Progress value={d.game.level.progress * 100} label="Keyingi darajagacha" />
                </div>
                {d.game.earned.length ? (
                  <div className="flex flex-wrap gap-2">
                    {d.game.earned.slice(0, 6).map((e) => {
                      const def = ACHIEVEMENTS.find((a) => a.code === e.code);
                      return def ? (
                        <span key={e.code} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 py-1 pr-3 pl-1 text-[12.5px] font-medium text-text-2" title={def.description}>
                          <AchievementIcon name={def.icon} tier={def.tier} size={24} />
                          {def.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <Award className="size-4" aria-hidden /> Birinchi vazifani topshirib, birinchi yutuqni qo‘lga kiriting.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={line ? "h-0.5 w-3.5 rounded" : "size-2.5 rounded-[3px]"} style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}
