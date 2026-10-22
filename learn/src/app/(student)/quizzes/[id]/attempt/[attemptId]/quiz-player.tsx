"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CloudOff, Grid3x3, Loader2, Send, Timer } from "lucide-react";
import { saveAnswerAction, submitQuizAction } from "@/app/actions/student";
import type { PublicQuestion } from "@/server/services/quiz";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/form";
import { RichText } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { useOnline } from "@/components/app/pwa";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { AudioPlayer, ListeningPlayer } from "@/components/app/media";
import { play } from "@/lib/sfx";

type Answer = { optionId?: string; optionIds?: string[]; text?: string; blanks?: string[]; matches?: Record<string, string> } | null;
type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  attemptId: string;
  assignmentId: string;
  title: string;
  questions: PublicQuestion[];
  initialAnswers: Record<string, Answer>;
  expiresAt: string | null;
  serverNow: string;
  allowBack: boolean;
  showOverview: boolean;
  /** Reading text / listening clip shared by all questions. */
  context?: { passage: string; audioFileId: string | null; replayLimit: number | null; transcript: string };
};

function isAnswered(q: PublicQuestion, a: Answer) {
  if (!a) return false;
  switch (q.type) {
    case "single_choice":
    case "true_false":
      return !!a.optionId;
    case "multiple_choice":
      return !!a.optionIds?.length;
    case "short_answer":
    case "essay":
    case "translation":
    case "grammar_correction":
    case "arrange_words":
      return !!a.text?.trim();
    case "fill_blank":
    case "irregular_verb":
      return !!a.blanks?.some((b) => b?.trim());
    case "matching":
      return Object.values(a.matches ?? {}).some(Boolean);
  }
}

const TEXT_TYPES = new Set(["short_answer", "essay", "fill_blank", "translation", "grammar_correction", "irregular_verb"]);

export function QuizPlayer(p: Props) {
  const router = useRouter();
  const online = useOnline();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(p.initialAnswers);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [overview, setOverview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dirty = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  // ── Timer (synchronised with server clock) ──
  const offset = useMemo(() => new Date(p.serverNow).getTime() - Date.now(), [p.serverNow]);
  const deadline = p.expiresAt ? new Date(p.expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!deadline) return;
    const i = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(i);
  }, [deadline, offset]);
  const left = deadline ? Math.max(0, deadline - now) : null;

  // ── Saving ──
  const persist = useCallback(
    async (qid: string) => {
      if (submittedRef.current) return;
      setSaveState((s) => ({ ...s, [qid]: "saving" }));
      const r = await saveAnswerAction(p.attemptId, qid, answersRef.current[qid] ?? null).catch(() => ({ ok: false as const, error: "network", code: "network" }));
      if (r.ok) {
        dirty.current.delete(qid);
        setSaveState((s) => ({ ...s, [qid]: "saved" }));
      } else {
        setSaveState((s) => ({ ...s, [qid]: "error" }));
        if (r.code === "closed") {
          submittedRef.current = true;
          toast.info(r.error);
          router.replace(`/quizzes/${p.assignmentId}/results/${p.attemptId}`);
        }
      }
    },
    [p.attemptId, p.assignmentId, router],
  );

  const setAnswer = (q: PublicQuestion, a: Answer) => {
    if (!TEXT_TYPES.has(q.type)) play("tap");
    setAnswers((prev) => ({ ...prev, [q.id]: a }));
    answersRef.current = { ...answersRef.current, [q.id]: a };
    dirty.current.add(q.id);
    setSaveState((s) => ({ ...s, [q.id]: "idle" }));
    clearTimeout(timers.current.get(q.id));
    timers.current.set(q.id, setTimeout(() => persist(q.id), TEXT_TYPES.has(q.type) ? 900 : 150));
  };

  // Retry failed saves when the connection returns.
  useEffect(() => {
    if (online) dirty.current.forEach((qid) => persist(qid));
  }, [online, persist]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty.current.size && !submittedRef.current) e.preventDefault();
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, []);

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current && !auto) return;
      setSubmitting(true);
      setSubmitError(null);
      timers.current.forEach((t) => clearTimeout(t));
      const r = await submitQuizAction(p.attemptId, answersRef.current).catch(() => ({ ok: false as const, error: "Internet aloqasi yo‘q. Javoblaringiz qurilmada saqlanib turibdi — aloqa tiklangach qayta bosing.", code: "network" }));
      if (r.ok || r.code === "closed" || r.code === "not_found") {
        submittedRef.current = true;
        dirty.current.clear();
        // No router.refresh() here: it can race the navigation and leave the student on the quiz page.
        // The results page is always rendered fresh; if client navigation stalls, fall back to a full load.
        const target = `/quizzes/${p.assignmentId}/results/${p.attemptId}`;
        router.replace(target);
        setTimeout(() => {
          if (!location.pathname.endsWith(`/results/${p.attemptId}`)) location.assign(target);
        }, 2500);
        return;
      }
      setSubmitting(false);
      setSubmitError(r.error);
      if (auto) toast.error(r.error);
    },
    [p.attemptId, p.assignmentId, router],
  );

  // Auto-submit when the timer runs out.
  const autoFired = useRef(false);
  useEffect(() => {
    if (left === 0 && !autoFired.current) {
      autoFired.current = true;
      toast.info("Vaqt tugadi — javoblaringiz topshirilmoqda");
      submit(true);
    }
  }, [left, submit]);

  const q = p.questions[index];
  const total = p.questions.length;
  const answeredCount = p.questions.filter((x) => isAnswered(x, answers[x.id] ?? null)).length;
  const unanswered = total - answeredCount;
  const goTo = (i: number) => {
    if (i < index && !p.allowBack) return;
    setIndex(Math.max(0, Math.min(total - 1, i)));
    setOverview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const st = saveState[q.id] ?? (answers[q.id] ? "saved" : "idle");
  const lowTime = left != null && left < 60_000;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 -mx-4 mb-5 border-b border-border/70 bg-bg/90 px-4 pt-2 pb-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4 lg:top-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-muted">{p.title}</div>
            <div className="text-[15px] font-bold tabular">
              {index + 1}-savol <span className="font-normal text-muted">/ {total}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {left != null ? (
              <span className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[14px] font-bold tabular", lowTime ? "animate-pulse bg-danger-soft text-danger" : "bg-surface-2 text-text")} role="timer" aria-live={lowTime ? "assertive" : "off"} aria-label="Qolgan vaqt">
                <Timer className="size-4" aria-hidden />
                {fmtClock(left)}
              </span>
            ) : null}
            {p.showOverview ? (
              <Button variant="secondary" size="icon" onClick={() => setOverview((v) => !v)} aria-label="Savollar ro‘yxati" aria-expanded={overview}>
                <Grid3x3 />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={total} aria-label="Javob berilgan savollar">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        {overview ? (
          <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {p.questions.map((x, i) => {
              const done = isAnswered(x, answers[x.id] ?? null);
              const disabled = i < index && !p.allowBack;
              return (
                <button
                  key={x.id}
                  onClick={() => goTo(i)}
                  disabled={disabled}
                  className={cn(
                    "h-9 rounded-lg text-[13px] font-bold tabular transition disabled:opacity-40",
                    i === index ? "bg-text text-bg" : done ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-2 text-muted hover:bg-surface-3",
                  )}
                  aria-label={`${i + 1}-savol${done ? ", javob berilgan" : ""}`}
                  aria-current={i === index ? "step" : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {p.context && (p.context.passage || p.context.audioFileId) ? <QuizContext attemptId={p.attemptId} {...p.context} /> : null}

      {/* Question */}
      <section key={q.id} className="animate-fade-up rounded-3xl border-2 border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby={`q-${q.id}`}>
        <div className="mb-3 flex items-center justify-between gap-2 text-[12.5px] text-muted">
          <span>{t.questionType[q.type]}</span>
          <span className="tabular">{q.points} ball</span>
        </div>
        <div id={`q-${q.id}`} className="text-[16.5px] leading-relaxed font-semibold text-text">
          {q.type === "fill_blank" ? <span className="text-muted">Bo‘sh joylarni to‘ldiring:</span> : <RichText text={q.prompt} />}
        </div>
        {q.imageFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${q.imageFileId}`} alt="Savol rasmi" className="mt-4 max-h-80 w-full rounded-xl border border-border bg-surface-2 object-contain" />
        ) : null}
        {q.audioFileId ? (
          <div className="mt-4">
            <AudioPlayer file={{ id: q.audioFileId, name: "Audio", size: 0 }} title="Tinglang" />
          </div>
        ) : null}
        <div className="mt-5">
          <QuestionInput q={q} value={answers[q.id] ?? null} onChange={(a) => setAnswer(q, a)} />
        </div>
        <div className="mt-4 flex h-5 items-center gap-1.5 text-[12px] text-muted" aria-live="polite">
          {!online ? (
            <>
              <CloudOff className="size-3.5 text-warning" aria-hidden /> Oflayn — javob aloqa tiklanganda saqlanadi
            </>
          ) : st === "saving" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saqlanmoqda…
            </>
          ) : st === "error" ? (
            <>
              <AlertTriangle className="size-3.5 text-warning" aria-hidden /> Saqlanmadi — qayta urinilmoqda
            </>
          ) : st === "saved" ? (
            <>
              <Check className="size-3.5 text-success" aria-hidden /> Saqlandi
            </>
          ) : null}
        </div>
      </section>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0 || !p.allowBack}>
          <ChevronLeft /> {t.common.previous}
        </Button>
        {index < total - 1 ? (
          <Button onClick={() => goTo(index + 1)}>
            {t.common.next} <ChevronRight />
          </Button>
        ) : (
          <Button onClick={() => setConfirm(true)}>
            <Send /> Yakunlash
          </Button>
        )}
      </div>
      {index < total - 1 ? (
        <div className="mt-6 text-center">
          <button onClick={() => setConfirm(true)} className="text-[13px] font-semibold text-muted underline-offset-4 hover:text-text hover:underline">
            Quizni hozir yakunlash
          </button>
        </div>
      ) : null}

      <Dialog
        open={confirm}
        onClose={() => !submitting && setConfirm(false)}
        title="Quizni yakunlaysizmi?"
        description="Topshirgandan so‘ng javoblarni o‘zgartirib bo‘lmaydi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={submitting}>
              Qaytish
            </Button>
            <Button onClick={() => submit(false)} loading={submitting}>
              Ha, topshirish
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-success-soft px-4 py-3">
            <div className="text-[12px] text-success">Javob berilgan</div>
            <div className="text-[22px] font-bold tabular">{answeredCount}</div>
          </div>
          <div className={cn("rounded-xl px-4 py-3", unanswered ? "bg-warning-soft" : "bg-surface-2")}>
            <div className={cn("text-[12px]", unanswered ? "text-warning" : "text-muted")}>Javobsiz</div>
            <div className="text-[22px] font-bold tabular">{unanswered}</div>
          </div>
        </div>
        {submitError ? <p className="mt-3 text-[13px] text-danger" role="alert">{submitError}</p> : null}
      </Dialog>
    </div>
  );
}

function fmtClock(ms: number) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function OptionCard({ selected, onClick, children, kind, letter }: { selected: boolean; onClick: () => void; children: React.ReactNode; kind: "radio" | "checkbox"; letter?: string }) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left text-[16px] font-semibold transition active:translate-y-[2px] active:border-b-2",
        selected ? "border-primary bg-primary-soft text-text ring-1 ring-primary" : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center text-[12.5px] font-bold transition",
          kind === "radio" ? "rounded-full" : "rounded-md",
          selected ? "bg-primary text-primary-fg" : "border border-border-strong text-muted",
        )}
        aria-hidden
      >
        {selected ? <Check className="size-4" strokeWidth={3} /> : letter}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

function QuestionInput({ q, value, onChange }: { q: PublicQuestion; value: Answer; onChange: (a: Answer) => void }) {
  const letters = "ABCDEFGHIJ";
  switch (q.type) {
    case "single_choice":
      return (
        <div className="space-y-2.5" role="radiogroup">
          {q.options.map((o, i) => (
            <OptionCard key={o.id} kind="radio" letter={letters[i]} selected={value?.optionId === o.id} onClick={() => onChange({ optionId: o.id })}>
              <RichText text={o.label} as="span" />
            </OptionCard>
          ))}
        </div>
      );
    case "true_false":
      return (
        <div className="grid grid-cols-2 gap-3" role="radiogroup">
          {q.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={value?.optionId === o.id}
              onClick={() => onChange({ optionId: o.id })}
              className={cn("h-16 rounded-2xl border-2 border-b-4 text-[17px] font-extrabold transition active:translate-y-[2px] active:border-b-2", value?.optionId === o.id ? "border-primary bg-primary-soft text-primary-soft-fg ring-1 ring-primary" : "border-border bg-surface hover:bg-surface-2")}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    case "multiple_choice": {
      const sel = new Set(value?.optionIds ?? []);
      return (
        <div className="space-y-2.5">
          <p className="text-[12.5px] text-muted">Bir nechta javobni tanlash mumkin.</p>
          {q.options.map((o, i) => (
            <OptionCard
              key={o.id}
              kind="checkbox"
              letter={letters[i]}
              selected={sel.has(o.id)}
              onClick={() => {
                const next = new Set(sel);
                if (next.has(o.id)) next.delete(o.id);
                else next.add(o.id);
                onChange({ optionIds: [...next] });
              }}
            >
              <RichText text={o.label} as="span" />
            </OptionCard>
          ))}
        </div>
      );
    }
    case "short_answer":
      return <Input value={value?.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="Javobingiz" maxLength={500} className="h-12 text-[16px]" aria-label="Javob" autoComplete="off" />;
    case "essay":
      return <Textarea value={value?.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="Javobingizni yozing…" rows={8} maxLength={5000} aria-label="Javob" />;
    case "fill_blank": {
      const parts = q.prompt.split(/_{3,}/);
      const blanks = value?.blanks ?? Array(q.blanks).fill("");
      return (
        <div className="rounded-xl bg-surface-2 p-4 text-[16px] leading-[2.6]">
          {parts.map((part, i) => (
            <span key={i}>
              <RichText text={part} as="span" />
              {i < parts.length - 1 ? (
                <input
                  value={blanks[i] ?? ""}
                  onChange={(e) => {
                    const next = [...blanks];
                    next[i] = e.target.value;
                    onChange({ blanks: next });
                  }}
                  aria-label={`${i + 1}-bo‘sh joy`}
                  maxLength={200}
                  autoComplete="off"
                  className="mx-1 inline-block h-9 w-32 rounded-lg border border-border-strong bg-surface px-2.5 text-center text-base font-semibold focus:border-primary focus:ring-4 focus:ring-[var(--ring)] focus:outline-none"
                />
              ) : null}
            </span>
          ))}
        </div>
      );
    }
    case "translation":
      return (
        <div className="space-y-2">
          <p className="text-[12.5px] font-semibold text-muted">{q.direction === "uz_en" ? "O‘zbekchadan inglizchaga tarjima qiling" : "Inglizchadan o‘zbekchaga tarjima qiling"}</p>
          <Textarea value={value?.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="Tarjimangiz…" rows={3} maxLength={2000} aria-label="Tarjima" spellCheck={false} />
        </div>
      );
    case "grammar_correction":
      return (
        <div className="space-y-2">
          <div className="rounded-xl bg-danger-soft/60 px-4 py-3 text-[15.5px] text-text-2">{q.incorrect}</div>
          <p className="text-[12.5px] text-muted">Xatoni toping va gapni to‘g‘ri yozing:</p>
          <Textarea value={value?.text ?? q.incorrect} onChange={(e) => onChange({ text: e.target.value })} rows={2} maxLength={1000} aria-label="To‘g‘ri gap" spellCheck={false} />
        </div>
      );
    case "arrange_words":
      return <ArrangeWords tokens={q.tokens} value={value?.text ?? ""} onChange={(text) => onChange({ text })} />;
    case "irregular_verb": {
      const b = value?.blanks ?? ["", ""];
      const set = (i: number, v: string) => onChange({ blanks: [i === 0 ? v : (b[0] ?? ""), i === 1 ? v : (b[1] ?? "")] });
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <div className="text-[11.5px] font-semibold text-muted">V1 · Base form</div>
            <div className="mt-1 text-[18px] font-bold">{q.base}</div>
          </div>
          {["V2 · Past Simple", "V3 · Past Participle"].map((label, i) => (
            <label key={label} className="block rounded-xl border border-border px-4 py-2.5">
              <span className="text-[11.5px] font-semibold text-muted">{label}</span>
              <input value={b[i] ?? ""} onChange={(e) => set(i, e.target.value)} maxLength={60} autoComplete="off" autoCapitalize="none" spellCheck={false} className="mt-1 block w-full bg-transparent text-[18px] font-bold outline-none" />
            </label>
          ))}
        </div>
      );
    }
    case "matching": {
      const m = value?.matches ?? {};
      return (
        <div className="space-y-2.5">
          {q.left.map((l) => (
            <div key={l.id} className="grid items-center gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr]">
              <div className="text-[15px] font-semibold">
                <RichText text={l.label} as="span" />
              </div>
              <Select value={m[l.id] ?? ""} onChange={(e) => onChange({ matches: { ...m, [l.id]: e.target.value } })} aria-label={`${l.label} uchun moslik`}>
                <option value="">Tanlang…</option>
                {q.right.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      );
    }
  }
}

/** Tap words to build the sentence; tap a placed word to send it back. */
function ArrangeWords({ tokens, value, onChange }: { tokens: string[]; value: string; onChange: (text: string) => void }) {
  // Rebuild the picked indices from the saved sentence (greedy, handles repeated words).
  const initial = useMemo(() => {
    const used = new Set<number>();
    const picked: number[] = [];
    for (const w of value.split(/\s+/).filter(Boolean)) {
      const i = tokens.findIndex((t, j) => t === w && !used.has(j));
      if (i >= 0) {
        used.add(i);
        picked.push(i);
      }
    }
    return picked;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);
  const [picked, setPicked] = useState<number[]>(initial);
  const update = (next: number[]) => {
    setPicked(next);
    onChange(next.map((i) => tokens[i]).join(" "));
  };
  return (
    <div className="space-y-4">
      <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/60 p-3" aria-label="Siz tuzgan gap">
        {picked.length ? (
          picked.map((i, k) => (
            <button key={`${i}-${k}`} type="button" onClick={() => update(picked.filter((_, j) => j !== k))} className="rounded-lg bg-primary px-3 py-1.5 text-[15px] font-semibold text-primary-fg shadow-soft active:scale-95">
              {tokens[i]}
            </button>
          ))
        ) : (
          <span className="text-[13px] text-muted">So‘zlarni to‘g‘ri tartibda bosing</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tokens.map((w, i) =>
          picked.includes(i) ? (
            <span key={i} className="rounded-lg border border-border px-3 py-1.5 text-[15px] text-transparent select-none" aria-hidden>
              {w}
            </span>
          ) : (
            <button key={i} type="button" onClick={() => update([...picked, i])} className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-[15px] font-semibold hover:border-primary active:scale-95">
              {w}
            </button>
          ),
        )}
      </div>
      {picked.length ? (
        <button type="button" onClick={() => update([])} className="text-[12.5px] font-semibold text-muted hover:text-text">
          Tozalash
        </button>
      ) : null}
    </div>
  );
}

function QuizContext({ attemptId, passage, audioFileId, replayLimit, transcript }: { attemptId: string; passage: string; audioFileId: string | null; replayLimit: number | null; transcript: string }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mb-4 rounded-3xl border-2 border-border bg-surface shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-[13.5px] font-bold" aria-expanded={open}>
        {passage ? "Reading matni" : "Listening"}
        <span className="text-[12px] font-semibold text-muted">{open ? "Yashirish" : "Ko‘rsatish"}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-5 py-4">
          {audioFileId ? <ListeningPlayer fileId={audioFileId} limit={replayLimit} storageKey={attemptId} /> : null}
          {passage ? <div className="prose-text max-h-[45dvh] overflow-y-auto text-[15.5px] leading-[1.75] text-text">{passage}</div> : null}
          {transcript ? (
            <details className="rounded-xl bg-surface-2 px-4 py-3 text-[14px]">
              <summary className="cursor-pointer font-semibold">Transkript</summary>
              <div className="prose-text mt-2 text-text-2">{transcript}</div>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
