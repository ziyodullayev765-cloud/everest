import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookA, BookOpenText, CheckCircle2, Gamepad2, Headphones, PenLine, Clock3, Flame, Gauge, ListTodo, PlayCircle, Target, Trophy, Zap, ChevronRight, CalendarRange } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { studentDashboard } from "@/server/services/analytics";
import { ownProfile } from "@/server/services/users";
import { getSettings } from "@/server/services/settings";
import { formatDateTime, formatLongToday, remaining } from "@/lib/dates";
import { cn, fmtNumber, fmtPercent } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/page";
import { EmptyState, Progress, Ring } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { hrefFor } from "@/components/student/assignment-card";
import { WeeklyActivityChart } from "@/components/student/charts";
import { Medal } from "@/components/student/medal";
import { recentAchievements } from "@/server/services/achievements";

export const metadata: Metadata = { title: "Bosh sahifa" };

const MOTIVATION = [
  "Little by little, a little becomes a lot. — Oz-ozdan, ko‘p bo‘ladi.",
  "Practice makes progress. — Mashq natija beradi.",
  "Every word you learn is yours forever. — Har bir yangi so‘z — sizniki.",
  "Mistakes are proof that you are trying. — Xato — harakat belgisi.",
  "Ten minutes a day beats two hours once a week. — Har kuni 10 daqiqa yaxshiroq.",
  "Don’t stop until you’re proud. — To‘xtamang!",
  "Small steps every day. — Har kuni kichik qadam.",
];

const PRACTICE = [
  { href: "/vocabulary", label: "Lug‘at", hint: "So‘zlarni takrorlash", icon: BookA, cls: "bg-info shadow-[0_5px_0_0_var(--info-shadow)] active:shadow-[0_2px_0_0_var(--info-shadow)]" },
  { href: "/vocabulary/game", label: "O‘yin", hint: "Tezkor so‘z o‘yini", icon: Gamepad2, cls: "bg-sun !text-[#3d2a00] shadow-[0_5px_0_0_var(--sun-shadow)] active:shadow-[0_2px_0_0_var(--sun-shadow)]" },
  { href: "/grammar", label: "Grammatika", hint: "Mavzular bo‘yicha", icon: PenLine, cls: "bg-primary shadow-[0_5px_0_0_var(--primary-shadow)] active:shadow-[0_2px_0_0_var(--primary-shadow)]" },
  { href: "/reading", label: "Reading", hint: "Matn va savollar", icon: BookOpenText, cls: "bg-violet shadow-[0_5px_0_0_var(--violet-shadow)] active:shadow-[0_2px_0_0_var(--violet-shadow)]" },
  { href: "/listening", label: "Listening", hint: "Tinglab tushunish", icon: Headphones, cls: "bg-danger shadow-[0_5px_0_0_var(--danger-shadow)] active:shadow-[0_2px_0_0_var(--danger-shadow)]" },
];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Tashkent" }).format(new Date()));
  return h < 11 ? t.greeting.morning : h < 18 ? t.greeting.day : t.greeting.evening;
}

export default async function StudentHome() {
  const user = await pageUser("student");
  const [profile, settings, recent] = await Promise.all([ownProfile(user.id), getSettings(), recentAchievements(user.id, 3)]);
  const d = await studentDashboard(user.id, profile.weeklyTaskGoal, profile.dailyGoal);
  const gamify = settings.gamification.enabled && profile.gamificationEnabled;
  const firstName = user.displayName.split(" ")[0];
  const dayIdx = Math.floor(Date.now() / 86400000) % MOTIVATION.length;
  const todayCount = d.todays.length;
  const nextDue = d.upcoming[0];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative animate-fade-up overflow-hidden rounded-3xl border-2 border-border bg-surface p-5 shadow-card sm:p-7">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_120%_at_100%_0%,var(--primary-soft),transparent_60%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-muted first-letter:uppercase">{formatLongToday()}</p>
            <h1 className="mt-1 text-[24px] leading-tight font-bold tracking-[-0.025em] text-text sm:text-[28px]">
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
          <div className="flex shrink-0 gap-2">
            <div className="flex items-center gap-2.5 rounded-3xl border-2 border-border bg-surface px-3.5 py-2.5 shadow-soft">
              <Flame className={cn("size-5", d.stats.streak ? "text-warning" : "text-muted")} aria-hidden />
              <div className="leading-tight">
                <div className="text-[17px] font-bold tabular">{d.stats.streak}</div>
                <div className="text-[11.5px] text-muted">kun ketma-ket</div>
              </div>
            </div>
            {gamify ? (
              <Link href="/achievements" className="flex items-center gap-2.5 rounded-3xl border-2 border-border bg-surface px-3.5 py-2.5 shadow-soft hover:border-border-strong">
                <Zap className="size-5 text-primary" aria-hidden />
                <div className="leading-tight">
                  <div className="text-[17px] font-bold tabular">{d.game.level.level}-daraja</div>
                  <div className="text-[11.5px] text-muted tabular">{fmtNumber(d.game.xp)} XP</div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Practice tiles */}
      <section aria-label="Mashq qilish" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PRACTICE.map(({ href, label, hint, icon: Icon, cls }) => (
          <Link key={href} href={href} className={cn("group flex flex-col gap-3 rounded-3xl p-4 text-white max-sm:last:col-span-2 transition active:translate-y-[3px]", cls)}>
            <span className="grid size-11 place-items-center rounded-2xl bg-white/25 transition group-hover:scale-105">
              <Icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-[16px] leading-tight font-black">{label}</span>
              <span className="block text-[12.5px] font-semibold opacity-85">{href === "/vocabulary" && d.stats.vocabDue ? `${d.stats.vocabDue} ta so‘z kutmoqda` : hint}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Stats */}
      <section aria-label="Ko‘rsatkichlar" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Vazifalar bajarilishi" value={d.stats.homeworkRate == null ? "—" : `${d.stats.homeworkRate}%`} icon={<CheckCircle2 />} hint={d.overdue.length ? `${d.overdue.length} tasi muddati o‘tgan` : `${d.stats.pending} ta kutilmoqda`} />
        <StatCard label="Quiz o‘rtachasi" value={fmtPercent(d.stats.quizAverage)} icon={<Target />} tone="violet" hint={d.stats.quizCount ? `${d.stats.quizCount} ta urinish` : "hali quiz yo‘q"} />
        <StatCard label="O‘rganilgan so‘zlar" value={d.stats.vocabLearned} icon={<BookA />} tone="info" hint={d.stats.vocabDue ? `${d.stats.vocabDue} tasi takrorlashga` : `${d.stats.vocabMastered} tasi puxta`} />
        <StatCard label="Ketma-ket kunlar" value={`${d.stats.streak} kun`} icon={<Flame />} tone="warning" hint={`eng yaxshisi: ${d.stats.bestStreak} kun`} />
        <StatCard label="Haftalik maqsad" value={`${d.stats.weeklyProgress}%`} icon={<Gauge />} tone="success" hint={`${d.stats.weekDone} / ${d.stats.weeklyTaskGoal} ta`} className="col-span-2 lg:col-span-1" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Today's learning */}
          <Card>
            <CardHeader title="Bugungi o‘quv" action={<LinkButton href="/assignments" variant="ghost" size="sm">Barcha vazifalar <ChevronRight /></LinkButton>} />
            <CardBody className="space-y-1 pt-2">
              {d.stats.vocabDue ? (
                <TodayRow href="/vocabulary/session?mode=daily" icon={<BookA />} tone="info" title={`${d.stats.vocabDue} ta so‘zni takrorlash vaqti keldi`} meta="Lug‘at · oraliq takrorlash" cta="Boshlash" />
              ) : null}
              {d.unfinished.slice(0, 3).map((a) => (
                <TodayRow key={a.id} href={hrefFor(a)} icon={<PlayCircle />} tone="warning" title={a.title} meta={`${a.status === "returned" ? "Qayta ishlashga qaytarilgan" : "Boshlangan"} · ${a.subjectName}`} cta="Davom ettirish" />
              ))}
              {d.focus
                .filter((a) => !d.unfinished.includes(a))
                .slice(0, 4)
                .map((a) => (
                  <TodayRow key={a.id} href={hrefFor(a)} icon={<ListTodo />} tone={a.dueAt && remaining(a.dueAt).hours < 24 ? "danger" : "primary"} title={a.title} meta={`${t.assignmentType[a.type]} · ${a.dueAt ? `muddat ${formatDateTime(a.dueAt)}` : "muddatsiz"}`} />
                ))}
              {!d.stats.vocabDue && !d.unfinished.length && !d.focus.length ? (
                <p className="px-2 py-6 text-center text-[13.5px] text-muted">Hozircha bajariladigan ish yo‘q. Lug‘at yoki grammatika bo‘limida mashq qilishingiz mumkin.</p>
              ) : null}
            </CardBody>
          </Card>

          {/* Weekly activity */}
          <Card>
            <CardHeader title="Haftalik faollik" description="So‘nggi 7 kun: vazifalar, quizlar, so‘z takrorlash va o‘rtacha ball" />
            <CardBody className="pt-3">
              {d.hasAnyActivity ? (
                <>
                  <WeeklyActivityChart data={d.week} />
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
                    <Legend color="var(--chart-1)" label="Vazifalar" />
                    <Legend color="var(--chart-2)" label="Quizlar" />
                    <Legend color="var(--violet)" label="Lug‘at (10 takrorlash = 1)" />
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
            <CardHeader title="Kunlik maqsad" description="Vazifa, quiz yoki 10 ta so‘z takrorlash = 1 mashg‘ulot" action={<LinkButton href="/profile/settings#goals" variant="ghost" size="sm">O‘zgartirish</LinkButton>} />
            <CardBody className="flex items-center gap-4">
              <Ring value={Math.min(100, (100 * d.stats.todayUnits) / d.stats.dailyGoal)} size={84} stroke={8}>
                <span className="text-[17px] font-bold tabular">
                  {Math.min(d.stats.todayUnits, d.stats.dailyGoal)}/{d.stats.dailyGoal}
                </span>
              </Ring>
              <div className="text-[13.5px] text-muted">
                {d.stats.todayUnits >= d.stats.dailyGoal ? (
                  <>Bugungi maqsad bajarildi. Ajoyib!</>
                ) : (
                  <>
                    Bugun <b className="text-text">{d.stats.todayUnits}</b> ta mashg‘ulot. Yana <b className="text-text">{d.stats.dailyGoal - d.stats.todayUnits}</b> ta qoldi.
                  </>
                )}
                <div className="mt-1 text-[12px]">Bu hafta: {d.stats.weekDone} / {d.stats.weeklyTaskGoal} ta ish.</div>
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
                            <span className="block truncate text-[13.5px] font-semibold text-text">{a.title}</span>
                            <span className="block text-[12px] text-muted">
                              {a.subjectName} · {formatDateTime(a.dueAt!)}
                            </span>
                          </span>
                          <span className={cn("shrink-0 text-[12px] font-semibold", level === "danger" ? "text-danger" : level === "warning" ? "text-warning" : "text-muted")} suppressHydrationWarning>
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
                {recent.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {recent.map((a) => (
                      <Link key={a.code} href={`/achievements/${a.code}`} className="flex flex-col items-center rounded-2xl border-2 border-border px-1 py-3 text-center hover:bg-surface-2">
                        <Medal icon={a.icon} category={a.category} size={44} />
                        <span className="mt-1.5 line-clamp-2 text-[11.5px] leading-tight font-extrabold">{a.title}</span>
                      </Link>
                    ))}
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

function TodayRow({ href, icon, tone, title, meta, cta }: { href: string; icon: React.ReactNode; tone: "primary" | "info" | "warning" | "danger"; title: string; meta: string; cta?: string }) {
  const tones = { primary: "bg-primary-soft text-primary", info: "bg-info-soft text-info", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" };
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5", tones[tone])} aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-text">{title}</span>
        <span className="block truncate text-[12px] text-muted">{meta}</span>
      </span>
      {cta ? <span className="shrink-0 text-[12.5px] font-bold text-primary">{cta}</span> : <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />}
    </Link>
  );
}
