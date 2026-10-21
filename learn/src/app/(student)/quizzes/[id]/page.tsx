import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronRight, HelpCircle, ListOrdered, RotateCcw, Target, Timer, Trophy } from "lucide-react";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { quizOverview } from "@/server/services/quiz";
import { formatDateTime, remaining } from "@/lib/dates";
import { percentOf } from "@/lib/grading";
import { fmtNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";
import { RichText } from "@/components/ui/rich-text";
import { StartQuizButton } from "./start-button";

export const metadata: Metadata = { title: "Quiz" };

const REVIEW: Record<string, string> = {
  never: "Javoblar ko‘rsatilmaydi",
  after_submit: "Topshirgandan so‘ng",
  after_due: "Muddat tugagandan so‘ng",
  after_grading: "Baholangandan so‘ng",
};

export default async function QuizOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("student");
  const o = await orNotFound(quizOverview(user, id));
  const a = o.assignment;
  const r = a.dueAt ? remaining(a.dueAt) : null;
  const facts = [
    { icon: ListOrdered, label: "Savollar", value: `${o.questionCount} ta` },
    { icon: Trophy, label: "Jami ball", value: fmtNumber(o.totalPoints, 2) },
    { icon: Timer, label: "Vaqt", value: a.timeLimitMinutes ? `${a.timeLimitMinutes} daqiqa` : "Cheklanmagan" },
    { icon: RotateCcw, label: "Urinishlar", value: `${o.attempts.length} / ${a.maxAttempts}` },
    { icon: Target, label: "O‘tish bali", value: `${a.passingPercent}%` },
    { icon: CalendarClock, label: "Muddat", value: a.dueAt ? formatDateTime(a.dueAt) : t.common.noDeadline },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/quizzes", label: t.nav.quizzes }}
        eyebrow={
          <span className="flex items-center gap-2">
            <span className="font-medium" style={{ color: o.subject?.color }}>
              {o.subject?.name}
            </span>
            <span aria-hidden>·</span> {t.assignmentType[a.type]}
          </span>
        }
        title={a.title}
      />
      <div className="space-y-5">
        <Card>
          <CardBody className="space-y-5">
            {a.description ? <RichText text={a.description} className="text-[15px] text-text-2" /> : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-surface-2 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-muted">
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </div>
                  <div className="mt-1 text-[14.5px] font-semibold tabular">{value}</div>
                </div>
              ))}
            </div>
            {a.instructions ? (
              <div className="rounded-xl border border-border p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
                  <HelpCircle className="size-4 text-primary" aria-hidden /> Ko‘rsatmalar
                </div>
                <RichText text={a.instructions} className="text-[14px] text-text-2" />
              </div>
            ) : null}
            <ul className="space-y-1 text-[13px] text-muted">
              <li>• Javoblaringiz avtomatik saqlanadi — sahifa yopilsa ham davom ettirishingiz mumkin.</li>
              {a.timeLimitMinutes ? <li>• Vaqt boshlangandan keyin to‘xtamaydi. Vaqt tugaganda javoblar avtomatik topshiriladi.</li> : null}
              {!a.allowBackNavigation ? <li>• Oldingi savolga qaytib bo‘lmaydi.</li> : null}
              <li>• Natijalar: {REVIEW[a.reviewMode]}.</li>
            </ul>
          </CardBody>
        </Card>

        {o.openAttempt ? (
          <Alert tone="warning" title="Tugallanmagan urinish bor">
            Siz {o.openAttempt.attemptNo}-urinishni boshlagansiz. Davom ettiring{o.openAttempt.expiresAt ? " — vaqt ketmoqda" : ""}.
          </Alert>
        ) : o.blocker ? (
          <Alert tone="info">{o.blocker}</Alert>
        ) : o.isLateWindow ? (
          <Alert tone="warning">Muddat o‘tgan — urinish kechikkan deb belgilanadi{a.latePenaltyPercent ? ` (−${a.latePenaltyPercent}%)` : ""}.</Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {r && !r.overdue ? (
            <span className="text-[13px] text-muted" suppressHydrationWarning>
              {r.text}
            </span>
          ) : (
            <span />
          )}
          {o.openAttempt ? (
            <StartQuizButton assignmentId={a.id} label="Davom ettirish" />
          ) : o.canStart ? (
            <StartQuizButton assignmentId={a.id} label={o.attempts.length ? "Qayta urinish" : "Quizni boshlash"} confirmTimed={a.timeLimitMinutes} />
          ) : null}
        </div>

        {o.attempts.length ? (
          <Card>
            <CardHeader title="Urinishlarim" />
            <CardBody className="pt-2">
              <ul className="-mx-2 divide-y divide-border">
                {o.attempts.map((at) => {
                  const pct = at.score == null ? null : percentOf(Number(at.score), Number(at.maxScore));
                  const href = at.status === "in_progress" ? `/quizzes/${a.id}/attempt/${at.id}` : `/quizzes/${a.id}/results/${at.id}`;
                  return (
                    <li key={at.id}>
                      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
                        <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-[13px] font-semibold tabular">{at.attemptNo}</span>
                        <span className="min-w-0 flex-1 text-[13px] text-muted">{formatDateTime(at.submittedAt ?? at.startedAt)}{at.isLate ? " · kechikkan" : ""}</span>
                        {at.status === "in_progress" ? (
                          <Badge tone="warning">Jarayonda</Badge>
                        ) : pct == null ? (
                          <Badge tone="violet">Tekshirilmoqda</Badge>
                        ) : (
                          <span className="text-[14px] font-semibold tabular">
                            {fmtNumber(Number(at.score), 2)} / {fmtNumber(Number(at.maxScore), 2)} <span className="font-normal text-muted">({Math.round(pct)}%)</span>
                          </span>
                        )}
                        <ChevronRight className="size-4 text-muted" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {o.grade ? (
                <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted">
                  Rasmiy baho: <b className="text-text tabular">{fmtNumber(o.grade.points, 2)} / {fmtNumber(o.grade.maxPoints, 2)}</b> ({o.grade.scaleLabel}) · {t.gradeStatus[o.grade.status]}
                  {a.maxAttempts > 1 ? " · eng yaxshi urinish hisoblanadi" : ""}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
