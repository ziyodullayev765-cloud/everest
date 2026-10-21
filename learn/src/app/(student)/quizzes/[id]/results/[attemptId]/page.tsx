import type { Metadata } from "next";
import { CheckCircle2, Clock, EyeOff, Lightbulb, MinusCircle, XCircle } from "lucide-react";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { attemptResult } from "@/server/services/quiz";
import { formatDateTime } from "@/lib/dates";
import { cn, fmtNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, Ring } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";

export const metadata: Metadata = { title: "Quiz natijasi" };

type Ans = { optionId?: string; optionIds?: string[]; text?: string; blanks?: string[]; matches?: Record<string, string> } | null;

export default async function ResultsPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const user = await pageUser("student");
  const r = await orNotFound(attemptResult(user, attemptId));
  const pending = r.score == null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: `/quizzes/${id}`, label: "Quiz" }} eyebrow={`${r.attempt.attemptNo}-urinish · ${formatDateTime(r.attempt.submittedAt!)}`} title={r.assignment.title} />

      <Card className="mb-5 overflow-hidden">
        <CardBody className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {pending ? (
            <div className="grid size-28 place-items-center rounded-full bg-violet-soft text-violet">
              <Clock className="size-10" aria-hidden />
            </div>
          ) : (
            <Ring value={r.percent ?? 0} size={120} stroke={10}>
              <div>
                <div className="text-[26px] leading-none font-semibold tabular">{Math.round(r.percent ?? 0)}%</div>
                <div className="mt-1 text-[11.5px] text-muted">natija</div>
              </div>
            </Ring>
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {pending ? (
              <>
                <h2 className="text-[19px] font-semibold">Javoblaringiz tekshirilmoqda</h2>
                <p className="mt-1 text-[14px] text-muted">Ba’zi savollarni o‘qituvchi baholaydi. Natija tayyor bo‘lganda bildirishnoma olasiz.</p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h2 className="text-[19px] font-semibold tabular">
                    {fmtNumber(Number(r.score), 2)} / {fmtNumber(r.maxScore, 2)} ball
                  </h2>
                  {r.passed ? <Badge tone="success">O‘tdi</Badge> : <Badge tone="warning">O‘tish bali: {r.assignment.passingPercent}%</Badge>}
                </div>
                <p className="mt-1 text-[14px] text-muted">{r.passed ? "Ajoyib natija! Shu ruhda davom eting." : "Yaxshi urinish. Xatolar ustida ishlab, natijani yaxshilash mumkin."}</p>
              </>
            )}
            {r.review && r.correctCount != null ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge tone="success">
                  <CheckCircle2 className="size-3.5" /> {r.correctCount} to‘g‘ri
                </Badge>
                <Badge tone="danger">
                  <XCircle className="size-3.5" /> {r.incorrectCount} noto‘g‘ri
                </Badge>
                {r.total - (r.correctCount ?? 0) - (r.incorrectCount ?? 0) > 0 ? (
                  <Badge tone="violet">
                    <MinusCircle className="size-3.5" /> {r.total - (r.correctCount ?? 0) - (r.incorrectCount ?? 0)} tekshiruvda
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {!r.review ? (
        <Alert tone="info" title="Javoblar hozircha yopiq">
          <span className="inline-flex items-center gap-1.5">
            <EyeOff className="size-4" aria-hidden />
            {r.assignment.reviewMode === "never" ? "O‘qituvchi bu quiz uchun javoblarni ko‘rsatmaslikni tanlagan." : r.assignment.reviewMode === "after_due" ? "To‘g‘ri javoblar muddat tugagandan keyin ochiladi." : "Javoblar baholash yakunlangandan keyin ochiladi."}
          </span>
        </Alert>
      ) : (
        <ol className="space-y-3">
          {r.items.map((it, i) => {
            const q = it.question;
            const a = it.answer as Ans;
            const tone = it.isCorrect === true ? "success" : it.isCorrect === false ? (Number(it.pointsAwarded) > 0 ? "warning" : "danger") : "violet";
            return (
              <li key={q.id} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="font-medium text-muted">
                    {i + 1}-savol · {t.questionType[q.type]}
                  </span>
                  <Badge tone={tone} className="tabular">
                    {it.pointsAwarded == null ? "Tekshirilmoqda" : `${fmtNumber(Number(it.pointsAwarded), 2)} / ${q.points}`}
                  </Badge>
                </div>
                <RichText text={q.type === "fill_blank" ? q.prompt.replace(/_{3,}/g, "____") : q.prompt} className="text-[15px] font-medium" />
                <div className="mt-3 space-y-2">
                  <AnswerReview q={q} a={a} correct={it.correct} />
                </div>
                {it.explanation ? (
                  <div className="mt-4 flex gap-2.5 rounded-xl bg-info-soft px-4 py-3 text-[13.5px] text-text-2">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                    <RichText text={it.explanation} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <LinkButton href={`/quizzes/${id}`} variant="secondary">
          Quiz sahifasi
        </LinkButton>
        <LinkButton href="/results">Natijalarim</LinkButton>
      </div>
    </div>
  );
}

type Correct = { optionIds: string[]; accepted: string[][]; matches: Record<string, string> } | null;
type Q = Awaited<ReturnType<typeof attemptResult>>["items"][number]["question"];

function AnswerReview({ q, a, correct }: { q: Q; a: Ans; correct: Correct }) {
  if (q.type === "single_choice" || q.type === "true_false" || q.type === "multiple_choice") {
    const chosen = new Set(q.type === "multiple_choice" ? (a?.optionIds ?? []) : a?.optionId ? [a.optionId] : []);
    const right = new Set(correct?.optionIds ?? []);
    return (
      <>
        {q.options.map((o) => {
          const isChosen = chosen.has(o.id);
          const isRight = right.has(o.id);
          return (
            <div
              key={o.id}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[14px]",
                isRight ? "border-success/30 bg-success-soft" : isChosen && correct ? "border-danger/30 bg-danger-soft" : isChosen ? "border-primary/40 bg-primary-soft" : "border-border",
              )}
            >
              {isRight ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="To‘g‘ri javob" /> : isChosen && correct ? <XCircle className="size-4 shrink-0 text-danger" aria-label="Noto‘g‘ri" /> : <span className="size-4 shrink-0" />}
              <RichText text={o.label} as="span" className="flex-1" />
              {isChosen ? <span className="text-[12px] font-medium text-muted">Sizning javobingiz</span> : null}
            </div>
          );
        })}
      </>
    );
  }
  if (q.type === "short_answer" || q.type === "essay")
    return (
      <>
        <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[14px]">
          <span className="text-[12px] text-muted">Sizning javobingiz: </span>
          {a?.text?.trim() ? <span className="prose-text">{a.text}</span> : <i className="text-muted">javob berilmagan</i>}
        </div>
        {correct?.accepted?.[0]?.length ? <div className="text-[13px] text-success">To‘g‘ri javob: {correct.accepted[0].join(" / ")}</div> : null}
      </>
    );
  if (q.type === "fill_blank")
    return (
      <div className="space-y-1.5">
        {Array.from({ length: q.blanks }).map((_, i) => (
          <div key={i} className="flex flex-wrap gap-x-3 text-[14px]">
            <span className="text-muted">{i + 1}.</span>
            <span>{a?.blanks?.[i]?.trim() || <i className="text-muted">bo‘sh</i>}</span>
            {correct?.accepted?.[i] ? <span className="text-success">→ {correct.accepted[i].join(" / ")}</span> : null}
          </div>
        ))}
      </div>
    );
  // matching
  const rightLabel = (token: string) => q.right.find((r) => r.id === token)?.label ?? "—";
  return (
    <div className="space-y-1.5">
      {q.left.map((l) => {
        const given = a?.matches?.[l.id];
        const ok = correct ? correct.matches[l.id] === given : null;
        return (
          <div key={l.id} className={cn("flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2 text-[14px]", ok === true ? "border-success/30 bg-success-soft" : ok === false ? "border-danger/30 bg-danger-soft" : "border-border")}>
            <b className="font-medium">{l.label}</b> → <span>{given ? rightLabel(given) : <i className="text-muted">tanlanmagan</i>}</span>
            {ok === false && correct ? <span className="text-success">(to‘g‘ri: {rightLabel(correct.matches[l.id])})</span> : null}
          </div>
        );
      })}
    </div>
  );
}
