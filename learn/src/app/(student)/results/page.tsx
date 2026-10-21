import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Clock, Minus, Sparkles, Star, Target, TrendingUp } from "lucide-react";
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
import { DailyBars, SubjectBars, TrendLine } from "@/components/student/charts";

export const metadata: Metadata = { title: "Natijalar" };

const RANGES = [
  { k: "7", label: "7 kun" },
  { k: "30", label: "30 kun" },
  { k: "90", label: "3 oy" },
  { k: "365", label: "1 yil" },
];

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const user = await pageUser("student");
  const sp = await searchParams;
  const days = RANGES.some((x) => x.k === sp.r) ? Number(sp.r) : 30;
  const today = localDay(new Date());
  const [r, profile] = await Promise.all([studentResults(user.id, { from: addDays(today, -(days - 1)), to: today }), ownProfile(user.id)]);
  const { thisWeek, lastWeek } = r.compare;
  const empty = r.gradedCount === 0 && r.completedVsAssigned.completed === 0 && r.daily.every((d) => d.tasks + d.quizzes === 0);
  const cva = r.completedVsAssigned;

  return (
    <>
      <PageHeader
        title="Natijalar"
        description="O‘sishingizni kuzating. Bu ma’lumotlar faqat sizga va o‘qituvchilaringizga ko‘rinadi."
        actions={
          <nav className="inline-flex rounded-xl border border-border bg-surface-2 p-1" aria-label="Davr">
            {RANGES.map((x) => (
              <Link key={x.k} href={`/results?r=${x.k}`} aria-current={String(days) === x.k ? "true" : undefined} className={cn("rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted", String(days) === x.k && "bg-surface text-text shadow-soft")}>
                {x.label}
              </Link>
            ))}
          </nav>
        }
      />

      {/* Weekly report */}
      <Card className="mb-6">
        <CardHeader title="Haftalik hisobot" description="Joriy hafta va o‘tgan hafta (dushanbadan boshlab)" icon={<TrendingUp />} />
        <CardBody className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-4">
          <Compare label="Vazifalar" now={thisWeek.tasks} prev={lastWeek.tasks} />
          <Compare label="Quizlar" now={thisWeek.quizzes} prev={lastWeek.quizzes} />
          <Compare label="O‘rtacha baho" now={thisWeek.average} prev={lastWeek.average} pct />
          <Compare label="Quiz aniqligi" now={thisWeek.accuracy} prev={lastWeek.accuracy} pct />
        </CardBody>
        <p className="px-5 pb-5 text-[13.5px] text-muted">{summarySentence(thisWeek, lastWeek)}</p>
      </Card>

      {empty ? (
        <Card>
          <EmptyState icon={<BarChart3 />} title="Bu davrda hali ma’lumot yo‘q" description="Vazifa va quizlarni topshirganingizdan so‘ng grafiklar avtomatik to‘ladi." action={<LinkButton href="/assignments">Vazifalarga o‘tish</LinkButton>} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="O‘rtacha baho" value={fmtPercent(r.averageGrade)} icon={<Star />} hint={`${r.gradedCount} ta baho`} />
            <StatCard label="Bajarilgan / berilgan" value={`${cva.completed} / ${cva.assigned}`} icon={<CheckCircle2 />} tone="info" hint="shu davr muddatli vazifalari" />
            <StatCard label="Quiz aniqligi" value={fmtPercent(r.quizAccuracy)} icon={<Target />} tone="violet" hint="to‘g‘ri javoblar" />
            <StatCard label="Muddatida topshirish" value={fmtPercent(r.punctuality.rate)} icon={<Clock />} tone="success" hint={`${r.punctuality.onTime} muddatida · ${r.punctuality.late} kech`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Fanlar bo‘yicha o‘rtacha" />
              <CardBody>{r.subjects.length ? <SubjectBars data={r.subjects} /> : <p className="py-8 text-center text-[13.5px] text-muted">Bu davrda baho yo‘q.</p>}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Vaqt bo‘yicha natija" description="Haftalik o‘rtacha baho" />
              <CardBody>{r.overTime.length > 1 ? <TrendLine data={r.overTime} /> : <p className="py-8 text-center text-[13.5px] text-muted">Trend uchun kamida ikki haftalik baho kerak.</p>}</CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Kunlik faollik" description="Topshirilgan vazifalar va yakunlangan quizlar" />
            <CardBody>
              <DailyBars data={r.daily} />
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Kuchli fanlar" icon={<Sparkles />} description="O‘rtacha 80% va undan yuqori" />
              <CardBody className="pt-3">
                {r.strong.length ? <SubjectList items={r.strong} tone="primary" /> : <p className="text-[13.5px] text-muted">Hozircha yo‘q — davom eting!</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Ko‘proq mashq qiling" icon={<Target />} description="O‘rtacha 60% dan past" />
              <CardBody className="pt-3">
                {r.needsPractice.length ? <SubjectList items={r.needsPractice} tone="warning" /> : <p className="text-[13.5px] text-muted">Barcha fanlarda yaxshi natija.</p>}
              </CardBody>
            </Card>
            <Card id="goals">
              <CardHeader title="Shaxsiy maqsadlar" action={<LinkButton href="/profile#goals" variant="ghost" size="sm">Sozlash</LinkButton>} />
              <CardBody className="space-y-4 pt-3 text-[13.5px]">
                <Goal label="Haftalik vazifalar" value={thisWeek.tasks + thisWeek.quizzes} target={profile.weeklyTaskGoal} />
                <p className="text-[12.5px] text-muted">Maqsadni profilingizda o‘zgartirishingiz mumkin.</p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function summarySentence(a: { tasks: number; quizzes: number; average: number | null }, b: { tasks: number; quizzes: number; average: number | null }) {
  const now = a.tasks + a.quizzes;
  const prev = b.tasks + b.quizzes;
  if (now === 0 && prev === 0) return "Bu va o‘tgan haftada faollik yo‘q. Bugun kichik qadamdan boshlang!";
  if (now > prev) return `Bu hafta o‘tgan haftadan ${now - prev} ta ko‘proq ish bajardingiz — zo‘r sur’at!`;
  if (now === prev) return "Barqaror sur’at: o‘tgan hafta bilan bir xil faollik.";
  return `O‘tgan haftada ${prev} ta ish bor edi. Hafta hali tugamadi — maqsadingizga yetishingiz mumkin.`;
}

function Compare({ label, now, prev, pct }: { label: string; now: number | null; prev: number | null; pct?: boolean }) {
  const delta = now != null && prev != null ? now - prev : null;
  const Icon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl bg-surface-2 px-4 py-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tabular">{now == null ? "—" : pct ? `${Math.round(now)}%` : now}</span>
        <span className={cn("inline-flex items-center text-[12px] font-medium tabular", delta == null || delta === 0 ? "text-muted" : delta > 0 ? "text-success" : "text-text-2")}>
          <Icon className="size-3.5" aria-hidden />
          {delta == null ? "" : pct ? `${Math.abs(Math.round(delta))}%` : Math.abs(delta)}
        </span>
      </div>
      <div className="text-[11.5px] text-muted">o‘tgan hafta: {prev == null ? "—" : pct ? `${Math.round(prev)}%` : prev}</div>
    </div>
  );
}

function SubjectList({ items, tone }: { items: { subject: string; average: number; color: string }[]; tone: "primary" | "warning" }) {
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.subject}>
          <div className="mb-1 flex justify-between text-[13.5px]">
            <span className="font-medium">{s.subject}</span>
            <span className="text-muted tabular">{Math.round(s.average)}%</span>
          </div>
          <Progress value={s.average} tone={tone} label={s.subject} />
        </li>
      ))}
    </ul>
  );
}

function Goal({ label, value, target }: { label: string; value: number; target: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-muted tabular">
          {value} / {target}
        </span>
      </div>
      <Progress value={(value / target) * 100} label={label} />
    </div>
  );
}
