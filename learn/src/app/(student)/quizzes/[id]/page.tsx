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
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Quiz"); } };

const REVIEW: Record<string, string> = {
  get never() { return tr("Javoblar ko‘rsatilmaydi"); },
  get after_submit() { return tr("Topshirgandan so‘ng"); },
  get after_due() { return tr("Muddat tugagandan so‘ng"); },
  get after_grading() { return tr("Baholangandan so‘ng"); },
};

export default async function QuizOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("student");
  const o = await orNotFound(quizOverview(user, id));
  const a = o.assignment;
  const r = a.dueAt ? remaining(a.dueAt) : null;
  const facts = [
    { icon: ListOrdered, label: tr("Savollar"), value: tr("{0} ta", o.questionCount) },
    { icon: Trophy, label: tr("Jami ball"), value: fmtNumber(o.totalPoints, 2) },
    { icon: Timer, label: tr("Vaqt"), value: a.timeLimitMinutes ? tr("{0} daqiqa", a.timeLimitMinutes) : tr("Cheklanmagan") },
    { icon: RotateCcw, label: tr("Urinishlar"), value: `${o.attempts.length} / ${a.maxAttempts}` },
    { icon: Target, label: tr("O‘tish bali"), value: `${a.passingPercent}%` },
    { icon: CalendarClock, label: tr("Muddat"), value: a.dueAt ? formatDateTime(a.dueAt) : t.common.noDeadline },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: "/quizzes", label: t.nav.quizzes }}
        eyebrow={
          <span className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: o.subject?.color }}>
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
                  <div className="mt-1 text-[14.5px] font-bold tabular">{value}</div>
                </div>
              ))}
            </div>
            {a.instructions ? (
              <div className="rounded-xl border border-border p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold">
                  <HelpCircle className="size-4 text-primary" aria-hidden /> {tr("Ko‘rsatmalar")}
                </div>
                <RichText text={a.instructions} className="text-[14px] text-text-2" />
              </div>
            ) : null}
            <ul className="space-y-1 text-[13px] text-muted">
              <li>{tr("• Javoblaringiz avtomatik saqlanadi — sahifa yopilsa ham davom ettirishingiz mumkin.")}</li>
              {a.timeLimitMinutes ? <li>{tr("• Vaqt boshlangandan keyin to‘xtamaydi. Vaqt tugaganda javoblar avtomatik topshiriladi.")}</li> : null}
              {!a.allowBackNavigation ? <li>{tr("• Oldingi savolga qaytib bo‘lmaydi.")}</li> : null}
              <li>{tr("• Natijalar: {0}.", REVIEW[a.reviewMode])}</li>
            </ul>
          </CardBody>
        </Card>

        {o.openAttempt ? (
          <Alert tone="warning" title={tr("Tugallanmagan urinish bor")}>
            {tr("Siz {0}-urinishni boshlagansiz. Davom ettiring{1}.", o.openAttempt.attemptNo, o.openAttempt.expiresAt ? tr(" — vaqt ketmoqda") : "")}
          </Alert>
        ) : o.blocker ? (
          <Alert tone="info">{o.blocker}</Alert>
        ) : o.isLateWindow ? (
          <Alert tone="warning">{tr("Muddat o‘tgan — urinish kechikkan deb belgilanadi")}{a.latePenaltyPercent ? ` (−${a.latePenaltyPercent}%)` : ""}.</Alert>
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
            <StartQuizButton assignmentId={a.id} label={tr("Davom ettirish")} />
          ) : o.canStart ? (
            <StartQuizButton assignmentId={a.id} label={o.attempts.length ? tr("Qayta urinish") : tr("Quizni boshlash")} confirmTimed={a.timeLimitMinutes} />
          ) : null}
        </div>

        {o.attempts.length ? (
          <Card>
            <CardHeader title={tr("Urinishlarim")} />
            <CardBody className="pt-2">
              <ul className="-mx-2 divide-y divide-border">
                {o.attempts.map((at) => {
                  const pct = at.score == null ? null : percentOf(Number(at.score), Number(at.maxScore));
                  const href = at.status === "in_progress" ? `/quizzes/${a.id}/attempt/${at.id}` : `/quizzes/${a.id}/results/${at.id}`;
                  return (
                    <li key={at.id}>
                      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2">
                        <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-[13px] font-bold tabular">{at.attemptNo}</span>
                        <span className="min-w-0 flex-1 text-[13px] text-muted">{formatDateTime(at.submittedAt ?? at.startedAt)}{at.isLate ? tr(" · kechikkan") : ""}</span>
                        {at.status === "in_progress" ? (
                          <Badge tone="warning">{tr("Jarayonda")}</Badge>
                        ) : pct == null ? (
                          <Badge tone="violet">{tr("Tekshirilmoqda")}</Badge>
                        ) : (
                          <span className="text-[14px] font-bold tabular">
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
                  {tr("Rasmiy baho:")} <b className="text-text tabular">{fmtNumber(o.grade.points, 2)} / {fmtNumber(o.grade.maxPoints, 2)}</b> ({o.grade.scaleLabel}) · {t.gradeStatus[o.grade.status]}
                  {a.maxAttempts > 1 ? tr(" · eng yaxshi urinish hisoblanadi") : ""}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
