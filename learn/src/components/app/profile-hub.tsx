import Link from "next/link";
import { sql } from "drizzle-orm";
import {
  BarChart3, Bell, Flame, BookOpenText, Bot, ChevronRight, ClipboardCheck, ClipboardList, Download, FileClock, GraduationCap, Headphones,
  Library, ListChecks, NotebookTabs, PenLine, Settings, ShieldCheck, Sparkles, Star, Trophy, UserRound, UsersRound, type LucideIcon,
} from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { ownProfile } from "@/server/services/users";
import { getSettings } from "@/server/services/settings";
import { studentClasses } from "@/server/services/classes";
import { activeDays, gamificationSummary } from "@/server/services/gamification";
import { recentAchievements } from "@/server/services/achievements";
import { isOwner } from "@/server/services/owner";
import { tutorEnabled } from "@/server/services/tutor";
import { db } from "@/server/db";
import { localDay, weekStart } from "@/lib/dates";
import { fmtNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Avatar } from "@/components/ui/avatar";
import { Medal } from "@/components/student/medal";
import { formatShortDate } from "@/lib/dates";

type Item = { href: string; label: string; icon: LucideIcon; hint?: string };

const MOTTO: Record<SessionUser["role"], string> = {
  student: "“Har kuni kichik qadamlar katta natijalarga olib keladi!”",
  teacher: "“Yaxshi ustoz — eng katta motivatsiya.”",
  admin: "“Tartibli tizim — samarali ta’lim.”",
  super_admin: "“Tartibli tizim — samarali ta’lim.”",
};

async function studentData(userId: string) {
  const [classes, days, r] = await Promise.all([
    studentClasses(userId),
    activeDays(userId),
    db.execute<{ submitted: number; quizzes: number; words: number }>(sql`
      select (select count(*)::int from submissions where student_id = ${userId} and version > 0) as submitted,
        (select count(*)::int from quiz_attempts where student_id = ${userId} and status <> 'in_progress') as quizzes,
        (select count(*)::int from vocab_progress where student_id = ${userId} and reps > 0) as words`),
  ]);
  const monday = weekStart(localDay(new Date()));
  const week = days.filter((d) => d >= monday).length;
  const s = r[0] ?? { submitted: 0, quizzes: 0, words: 0 };
  return {
    badge: classes.find((c) => c.level)?.level || classes[0]?.name || null,
    stats: [
      { label: "Bajarilgan vazifalar", value: s.submitted },
      { label: "Quizlar", value: s.quizzes },
      { label: "So‘zlar", value: s.words },
    ],
    week,
  };
}

async function teacherData(userId: string) {
  const r = await db.execute<{ groups: number; students: number; tasks: number }>(sql`
    with g as (select distinct ct.class_id from class_teachers ct join classes c on c.id = ct.class_id and c.archived_at is null where ct.teacher_id = ${userId})
    select (select count(*)::int from g) as groups,
      (select count(distinct cs.student_id)::int from class_students cs where cs.class_id in (select class_id from g)) as students,
      (select count(*)::int from assignments where created_by = ${userId} and archived_at is null) as tasks`);
  const s = r[0] ?? { groups: 0, students: 0, tasks: 0 };
  return [
    { label: "Guruhlar", value: s.groups },
    { label: "Talabalar", value: s.students },
    { label: "Vazifalar", value: s.tasks },
  ];
}

async function adminData() {
  const r = await db.execute<{ students: number; groups: number; tasks: number }>(sql`
    select (select count(*)::int from users where role = 'student' and status = 'active') as students,
      (select count(*)::int from classes where archived_at is null) as groups,
      (select count(*)::int from assignments where archived_at is null) as tasks`);
  const s = r[0] ?? { students: 0, groups: 0, tasks: 0 };
  return [
    { label: "Talabalar", value: s.students },
    { label: "Guruhlar", value: s.groups },
    { label: "Vazifalar", value: s.tasks },
  ];
}

function menuFor(role: SessionUser["role"], opts: { gamification: boolean }): Item[] {
  if (role === "student")
    return [
      { href: "/results", label: "Mening progressim", icon: BarChart3 },
      { href: "/assignments", label: "Uy vazifalarim", icon: ClipboardList },
      { href: "/quizzes", label: "Quiz natijalari", icon: ListChecks },
      { href: "/vocabulary", label: "So‘zlarim", icon: NotebookTabs },
      { href: "/grammar", label: "Grammatika", icon: PenLine },
      { href: "/reading", label: "Reading", icon: BookOpenText },
      { href: "/listening", label: "Listening", icon: Headphones },
      ...(tutorEnabled() ? [{ href: "/tutor", label: "AI yordamchi", icon: Bot }] : []),
      { href: "/grades", label: "Baholar", icon: Star },
      ...(opts.gamification ? [{ href: "/achievements", label: "Yutuqlar", icon: Trophy }] : []),
      { href: "/classes", label: "Guruhlarim", icon: UsersRound },
      { href: "/library", label: "Kutubxona", icon: Library },
      { href: "/notifications", label: "Bildirishnomalar", icon: Bell },
      { href: "/install", label: "Ilovani o‘rnatish", icon: Download },
      { href: "/profile/settings", label: "Sozlamalar", icon: Settings },
    ];
  if (role === "teacher")
    return [
      { href: "/teacher/classes", label: "Mening guruhlarim", icon: UsersRound },
      { href: "/teacher/assignments", label: "Vazifalar va testlar", icon: ClipboardList },
      { href: "/teacher/submissions", label: "Baholash", icon: ClipboardCheck },
      { href: "/teacher/vocabulary", label: "Lug‘at ro‘yxatlari", icon: NotebookTabs },
      { href: "/teacher/gradebook", label: "Baholar jurnali", icon: GraduationCap },
      { href: "/teacher/library", label: "Kutubxona", icon: Library },
      { href: "/teacher/notifications", label: "Xabarlar", icon: Bell },
      { href: "/teacher/profile/settings", label: "Sozlamalar", icon: Settings },
    ];
  return [
    { href: "/admin/students", label: "Talabalar", icon: UserRound },
    { href: "/admin/teachers", label: "O‘qituvchilar", icon: UsersRound },
    { href: "/admin/classes", label: "Guruhlar", icon: UsersRound },
    { href: "/admin/assignments", label: "Vazifalar va testlar", icon: ClipboardList },
    { href: "/admin/vocabulary", label: "Lug‘at ro‘yxatlari", icon: NotebookTabs },
    { href: "/admin/gradebook", label: "Hisobotlar", icon: BarChart3 },
    { href: "/admin/achievements", label: "Yutuqlar", icon: Trophy },
    { href: "/admin/settings", label: "Tizim sozlamalari", icon: ShieldCheck },
    { href: "/admin/audit", label: "Faoliyat jurnali", icon: FileClock },
    { href: "/admin/notifications", label: "Bildirishnomalar", icon: Bell },
    { href: "/admin/profile/settings", label: "Sozlamalar", icon: Settings },
  ];
}

export const settingsHref = (role: SessionUser["role"]) =>
  role === "student" ? "/profile/settings" : role === "teacher" ? "/teacher/profile/settings" : "/admin/profile/settings";

export async function ProfileHub({ user }: { user: SessionUser }) {
  const [p, settings] = await Promise.all([ownProfile(user.id), getSettings()]);
  const isStudent = user.role === "student";
  const sd = isStudent ? await studentData(user.id) : null;
  const stats = sd ? sd.stats : user.role === "teacher" ? await teacherData(user.id) : await adminData();
  const badge = sd ? sd.badge : t.role[p.role];
  const gameOn = isStudent && settings.gamification.enabled && p.gamificationEnabled;
  const menu = menuFor(user.role, { gamification: gameOn });
  if (isOwner(user)) menu.unshift({ href: "/maxfiy", label: "🤫 Maxfiy bo‘lim", icon: Sparkles });
  const [game, recent] = gameOn ? await Promise.all([gamificationSummary(user.id), recentAchievements(user.id, 3)]) : [null, []];

  return (
    <div className="-mx-4 -mt-5 sm:mx-auto sm:mt-0 sm:max-w-2xl">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0d5c3a] to-[#0f6e45] px-5 pt-6 pb-16 text-center text-white sm:rounded-[28px]">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/[0.06]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 size-56 rounded-full bg-white/[0.05]" />
        <Link href={settingsHref(user.role)} aria-label="Sozlamalar" className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
          <Settings className="size-5" aria-hidden />
        </Link>
        <div className="relative mx-auto w-fit rounded-full bg-white/20 p-1">
          <Avatar name={p.displayName} fileId={p.avatarFileId} size={92} className="ring-0" />
        </div>
        <h1 className="relative mt-3 text-[22px] leading-tight font-black">{p.displayName}</h1>
        <p className="relative text-[13.5px] font-semibold text-white/80">{t.role[p.role]}</p>
        {badge && badge !== t.role[p.role] ? (
          <span className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold">
            <GraduationCap className="size-3.5" aria-hidden /> {badge}
          </span>
        ) : !isStudent ? (
          <span className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold">
            <span className="size-2 rounded-full bg-[#5ee08f]" aria-hidden /> {p.role === "teacher" ? "Faol" : "Admin"}
          </span>
        ) : null}
        {game ? (
          <div className="relative mt-3 flex justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[12.5px] font-extrabold">
              <Flame className="size-4 text-[#ff9a3d]" aria-hidden /> {game.streak.current} kunlik streak
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[12.5px] font-extrabold">
              <Star className="size-4 fill-[#ffc22e] text-[#ffc22e]" aria-hidden /> {fmtNumber(game.xp, 0)} XP
            </span>
          </div>
        ) : null}
      </section>

      <div className="relative -mt-11 space-y-4 px-4 pb-4 sm:px-0">
        {/* Stats */}
        <section aria-label="Ko‘rsatkichlar" className="grid grid-cols-3 divide-x-2 divide-border rounded-3xl border-2 border-border bg-surface py-4 shadow-pop">
          {stats.map((s) => (
            <div key={s.label} className="px-2 text-center">
              <div className="text-[22px] leading-none font-black tabular">{fmtNumber(s.value, 0)}</div>
              <div className="mt-1.5 text-[11.5px] leading-tight font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Weekly progress (students) */}
        {sd ? (
          <section className="rounded-3xl border-2 border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold">
                <Sparkles className="size-4 text-primary" aria-hidden /> Haftalik faollik
              </h2>
              <span className="text-[13px] font-bold tabular">{sd.week}/7 kun</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={7} aria-valuenow={sd.week} aria-label="Haftalik faol kunlar">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(sd.week / 7) * 100}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-muted">Shu hafta vazifa, quiz yoki so‘z takrorlagan kunlaringiz.</p>
          </section>
        ) : null}

        {game ? (
          <section className="rounded-3xl border-2 border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold">So‘nggi yutuqlar</h2>
              <Link href="/achievements" className="text-[13px] font-extrabold text-primary">Barchasi</Link>
            </div>
            {recent.length ? (
              <div className="grid grid-cols-3 gap-2">
                {recent.map((a) => (
                  <Link key={a.code} href={`/achievements/${a.code}`} className="flex flex-col items-center rounded-2xl border-2 border-border px-1 py-3 text-center hover:bg-surface-2">
                    <Medal icon={a.icon} category={a.category} size={52} />
                    <span className="mt-1.5 line-clamp-2 text-[12px] leading-tight font-extrabold">{a.title}</span>
                    <span className="text-[11px] font-semibold text-muted">{formatShortDate(a.earnedAt)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Birinchi darsni yakunlang — birinchi yutuq ochiladi.</p>
            )}
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#fff4e5] p-3 dark:bg-[#2c2012]">
              <Flame className="size-8 shrink-0 text-[#ff7a1a]" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-extrabold">{game.streak.current} kunlik streak</div>
                <div className="text-[12px] text-muted">Eng uzun: {game.streak.best} kun. Har kuni ozgina mashq qiling!</div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Menu */}
        <nav aria-label="Profil menyusi" className="overflow-hidden rounded-3xl border-2 border-border bg-surface">
          <ul className="divide-y divide-border">
            {menu.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2 active:bg-surface-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{label}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="px-4 pt-2 text-center text-[13px] font-semibold text-muted italic">{MOTTO[user.role]}</p>
      </div>
    </div>
  );
}
