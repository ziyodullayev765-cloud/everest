import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CheckCircle2, Clock, EyeOff, Lightbulb, MinusCircle, XCircle } from "lucide-react";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { tutorEnabled } from "@/server/services/tutor";
import { Celebrate } from "@/components/app/celebrate";
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
  const ai = tutorEnabled();
  const pending = r.score == null;
  return (
    <div className="mx-auto max-w-3xl">
      <Celebrate show={!!r.passed} />
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
                <div className="text-[26px] leading-none font-bold tabular">{Math.round(r.percent ?? 0)}%</div>
                <div className="mt-1 text-[11.5px] text-muted">natija</div>
              </div>
            </Ring>
          )}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {pending ? (
              <>
                <h2 className="text-[19px] font-bold">Javoblaringiz tekshirilmoqda</h2>
                <p className="mt-1 text-[14px] text-muted">Ba’zi savollarni o‘qituvchi baholaydi. Natija tayyor bo‘lganda bildirishnoma olasiz.</p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h2 className="text-[19px] font-bold tabular">
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

      {r.durationMs != null || r.history.length > 1 ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {r.durationMs != null ? (
            <div className="rounded-3xl border-2 border-border bg-surface px-5 py-4 shadow-card">
              <div className="text-[12px] text-muted">Sarflangan vaqt</div>
              <div className="mt-0.5 text-[18px] font-bold tabular">{fmtDuration(r.durationMs)}</div>
            </div>
          ) : null}
          {r.history.length > 1 ? (
            <div className="rounded-3xl border-2 border-border bg-surface px-5 py-4 shadow-card">
              <div className="text-[12px] text-muted">Urinishlar</div>
              <ol className="mt-1.5 flex flex-wrap gap-1.5">
                {r.history.map((h, i) => {
                  const prev = i > 0 ? r.history[i - 1].percent : null;
                  const up = prev != null && h.percent != null ? h.percent - prev : null;
                  return (
                    <li key={h.id} className={cn("rounded-lg px-2.5 py-1 text-[12.5px] tabular", h.id === attemptId ? "bg-primary-soft font-bold text-primary-soft-fg" : "bg-surface-2")}>
                      #{h.attemptNo}: {h.percent == null ? "—" : `${h.percent}%`}
                      {up ? <span className={up > 0 ? "text-success" : "text-danger"}> {up > 0 ? "▲" : "▼"}{Math.abs(up)}</span> : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}

      {r.transcript ? (
        <details className="mb-5 rounded-3xl border-2 border-border bg-surface px-5 py-4 shadow-card">
          <summary className="cursor-pointer text-[14px] font-bold">Listening transkripti</summary>
          <div className="prose-text mt-3 text-[14.5px] text-text-2">{r.transcript}</div>
        </details>
      ) : null}

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
              <li key={q.id} className="rounded-3xl border-2 border-border bg-surface p-5 shadow-card">
                <div className="mb-2 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="font-semibold text-muted">
                    {i + 1}-savol · {t.questionType[q.type]}
                  </span>
                  <Badge tone={tone} className="tabular">
                    {it.pointsAwarded == null ? "Tekshirilmoqda" : `${fmtNumber(Number(it.pointsAwarded), 2)} / ${q.points}`}
                  </Badge>
                </div>
                <RichText text={q.type === "fill_blank" ? q.prompt.replace(/_{3,}/g, "____") : q.prompt} className="text-[15px] font-semibold" />
                <div className="mt-3 space-y-2">
                  <AnswerReview q={q} a={a} correct={it.correct} />
                </div>
                {ai && it.isCorrect === false ? (
                  <Link href={`/tutor?kind=mistake&text=${encodeURIComponent(mistakeText(q, a))}`} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-violet hover:underline">
                    <Bot className="size-3.5" aria-hidden /> AI yordamchidan tushuntirish so‘rash
                  </Link>
                ) : null}
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

/** Question + the student's own answer, as text for the tutor (no names or ids). */
function mistakeText(q: Q, a: Ans) {
  const given = a?.text ?? a?.blanks?.join(" / ") ?? (a?.optionId ? q.options.find((o) => o.id === a.optionId)?.label : undefined) ?? a?.optionIds?.map((id) => q.options.find((o) => o.id === id)?.label).join(", ") ?? "";
  return [`Savol: ${q.prompt}`, q.incorrect ? `Xato gap: ${q.incorrect}` : "", q.base ? `Fe’l: ${q.base}` : "", q.options.length ? `Variantlar: ${q.options.map((o) => o.label).join(" | ")}` : "", `Mening javobim: ${given || "(bo‘sh)"}`].filter(Boolean).join("\n").slice(0, 3900);
}

function fmtDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m} daq ${s % 60} soniya` : `${s} soniya`;
}

function TextAnswer({ a, correct }: { a: Ans; correct: Correct }) {
  return (
    <>
      <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[14px]">
        <span className="text-[12px] text-muted">Sizning javobingiz: </span>
        {a?.text?.trim() ? <span className="prose-text">{a.text}</span> : <i className="text-muted">javob berilmagan</i>}
      </div>
      {correct?.accepted?.[0]?.length ? <div className="text-[13px] text-success">To‘g‘ri javob: {correct.accepted[0].join(" / ")}</div> : null}
    </>
  );
}

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
              {isChosen ? <span className="text-[12px] font-semibold text-muted">Sizning javobingiz</span> : null}
            </div>
          );
        })}
      </>
    );
  }
  if (q.type === "grammar_correction" && q.incorrect) {
    return (
      <>
        <div className="text-[13px] text-muted line-through decoration-danger/60">{q.incorrect}</div>
        <TextAnswer a={a} correct={correct} />
      </>
    );
  }
  if (q.type === "short_answer" || q.type === "essay" || q.type === "translation" || q.type === "grammar_correction" || q.type === "arrange_words") return <TextAnswer a={a} correct={correct} />;
  if (q.type === "irregular_verb")
    return (
      <div className="space-y-1.5 text-[14px]">
        <div className="text-muted">V1: <b className="text-text">{q.base}</b></div>
        {["V2", "V3"].map((label, i) => (
          <div key={label} className="flex flex-wrap gap-x-3">
            <span className="text-muted">{label}:</span>
            <span>{a?.blanks?.[i]?.trim() || <i className="text-muted">bo‘sh</i>}</span>
            {correct?.accepted?.[i] ? <span className="text-success">→ {correct.accepted[i].join(" / ")}</span> : null}
          </div>
        ))}
      </div>
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
            <b className="font-semibold">{l.label}</b> → <span>{given ? rightLabel(given) : <i className="text-muted">tanlanmagan</i>}</span>
            {ok === false && correct ? <span className="text-success">(to‘g‘ri: {rightLabel(correct.matches[l.id])})</span> : null}
          </div>
        );
      })}
    </div>
  );
}
