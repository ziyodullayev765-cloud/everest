import type { Metadata } from "next";
import { Flame, Lock, Trophy, Zap } from "lucide-react";
import { sql } from "drizzle-orm";
import { pageUser } from "@/server/auth/guards";
import { gamificationSummary } from "@/server/services/gamification";
import { getSettings } from "@/server/services/settings";
import { db } from "@/server/db";
import { ACHIEVEMENTS, XP_RULE_LABELS, type XpRules } from "@/lib/gamification";
import { formatDate } from "@/lib/dates";
import { fmtNumber, fmtPercent } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Progress } from "@/components/ui/feedback";
import { AchievementIcon } from "@/components/student/achievement-icon";

export const metadata: Metadata = { title: "Yutuqlar" };

const TIER_LABEL = { bronze: "Bronza", silver: "Kumush", gold: "Oltin" };

export default async function AchievementsPage() {
  const user = await pageUser("student");
  const [g, settings] = await Promise.all([gamificationSummary(user.id), getSettings()]);
  if (!settings.gamification.enabled || !user.gamificationEnabled)
    return (
      <>
        <PageHeader title="Yutuqlar" />
        <Alert tone="info">{settings.gamification.enabled ? "Siz o‘yin elementlarini profil sozlamalarida o‘chirgansiz." : "Kurs o‘yin elementlarini (XP, nishonlar) o‘chirib qo‘ygan."}</Alert>
      </>
    );
  const bests = (
    await db.execute<{ best_quiz: string | null; best_grade: string | null; best_week: number | null }>(sql`
      select (select max(score / nullif(max_score,0) * 100) from quiz_attempts where student_id = ${user.id} and score is not null) as best_quiz,
        (select max(percent) from grades where student_id = ${user.id}) as best_grade,
        (select max(n)::int from (select count(*) as n from submission_versions v join submissions s on s.id = v.submission_id where s.student_id = ${user.id} and v.version = 1 group by date_trunc('week', v.submitted_at)) w) as best_week`)
  )[0];
  const earned = new Map(g.earned.map((e) => [e.code, e.earnedAt]));
  const rules = settings.gamification.rules;

  return (
    <>
      <PageHeader title="Yutuqlar" description="XP, darajalar va nishonlar — rasmiy baholarga ta’sir qilmaydi." />
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-primary text-primary-fg shadow-card">
              <div className="text-center leading-none">
                <div className="text-[28px] font-bold tabular">{g.level.level}</div>
                <div className="mt-1 text-[10.5px] font-bold tracking-wide uppercase">daraja</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[20px] font-bold tabular">{fmtNumber(g.xp)} XP</span>
                <span className="text-[13px] text-muted tabular">
                  keyingi daraja: {fmtNumber(g.level.next)} XP
                </span>
              </div>
              <Progress value={g.level.progress * 100} className="mt-3 h-2.5" label="Keyingi darajagacha" />
              <p className="mt-2 text-[13px] text-muted">{fmtNumber(g.level.next - g.xp)} XP qoldi</p>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Joriy seriya" value={`${g.streak.current} kun`} icon={<Flame />} tone="warning" />
          <StatCard label="Eng uzun seriya" value={`${g.streak.best} kun`} icon={<Flame />} tone="warning" hint="shaxsiy rekord" />
          <StatCard label="Eng yaxshi quiz" value={fmtPercent(bests?.best_quiz == null ? null : Math.round(Number(bests.best_quiz)))} icon={<Zap />} tone="violet" hint="shaxsiy rekord" />
          <StatCard label="Eng yaxshi hafta" value={`${bests?.best_week ?? 0} ta`} icon={<Trophy />} hint="topshirilgan ishlar" />
        </div>

        <Card>
          <CardHeader title="Nishonlar galereyasi" description={`${g.earned.length} / ${ACHIEVEMENTS.length} ta qo‘lga kiritilgan`} />
          <CardBody className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-5">
            {ACHIEVEMENTS.map((a) => {
              const at = earned.get(a.code);
              return (
                <div key={a.code} className={`flex flex-col items-center rounded-2xl border p-4 text-center ${at ? "border-border bg-surface" : "border-dashed border-border bg-surface-2/50"}`}>
                  <div className="relative">
                    <AchievementIcon name={a.icon} tier={a.tier} size={56} locked={!at} />
                    {!at ? <Lock className="absolute -right-1 -bottom-1 size-5 rounded-full bg-surface p-1 text-muted ring-1 ring-border" aria-hidden /> : null}
                  </div>
                  <div className={`mt-3 text-[13.5px] font-bold ${at ? "" : "text-muted"}`}>{a.title}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-muted">{a.description}</div>
                  <div className="mt-2 text-[11px] font-semibold text-muted">{at ? formatDate(at) : TIER_LABEL[a.tier]}</div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="XP qanday beriladi" description="Qoidalar shaffof. Takroriy so‘rovlar yoki qayta urinishlar XP ni ko‘paytirmaydi." />
          <CardBody className="pt-3">
            <ul className="divide-y divide-border text-[13.5px]">
              {(Object.keys(XP_RULE_LABELS) as (keyof XpRules)[]).map((k) => (
                <li key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-text-2">{XP_RULE_LABELS[k]}</span>
                  <span className="shrink-0 font-bold text-primary tabular">+{rules[k]} XP</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
