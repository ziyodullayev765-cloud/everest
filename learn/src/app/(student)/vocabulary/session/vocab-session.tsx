"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, PartyPopper, RotateCcw, Star, TriangleAlert, Volume2, X } from "lucide-react";
import type { SessionCard } from "@/server/services/vocabulary";
import { recordReviewAction, wordFlagAction } from "@/app/actions/vocab";
import { Button, LinkButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { Confetti } from "@/components/app/confetti";
import { buzz, play } from "@/lib/sfx";
import { cn } from "@/lib/utils";

export type Kind = "auto" | "flashcard" | "choice" | "typing" | "match";
type Step = { card: SessionCard; kind: Exclude<Kind, "auto" | "match">; retry: boolean };
type Outcome = { correct: boolean; english: string; uzbek: string };

/** Pick a mode per card in a mixed session: new words are introduced as flashcards, reviews alternate. */
function plan(cards: SessionCard[], kind: Kind): Step[] {
  return cards.map((card, i) => ({
    card,
    retry: false,
    kind: kind === "auto" || kind === "match" ? (card.isNew ? "flashcard" : i % 2 ? "typing" : "choice") : kind,
  }));
}

export function VocabSession({ cards, kind, backHref }: { cards: SessionCard[]; kind: Kind; backHref: string }) {
  const [queue, setQueue] = useState<Step[]>(() => plan(cards, kind));
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState({ total: 0, correct: 0 });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const total = queue.length;

  if (!cards.length)
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Check className="size-7" aria-hidden />
        </div>
        <h1 className="text-[20px] font-bold">Hozircha mashq qiladigan so‘z yo‘q</h1>
        <p className="mt-2 text-[14px] text-muted">Takrorlash vaqti kelganda so‘zlar shu yerda paydo bo‘ladi.</p>
        <LinkButton href={backHref} variant="secondary" className="mt-6">
          Orqaga
        </LinkButton>
      </div>
    );

  if (kind === "match") return <MatchBoard cards={cards} backHref={backHref} />;

  const step = queue[pos];
  const finished = pos >= total;

  const record = async (payload: Record<string, unknown>) => {
    setBusy(true);
    const r = await recordReviewAction({ wordId: step.card.id, kind: step.kind, ...payload });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error);
      return null;
    }
    setDone((d) => ({ total: d.total + 1, correct: d.correct + (r.data.correct ? 1 : 0) }));
    if (step.kind !== "flashcard") {
      if (r.data.correct) play("correct");
      else {
        play("wrong");
        buzz(50);
      }
    } else play("tap");
    // A missed word comes back once at the end of the session.
    if (!r.data.correct && !step.retry) setQueue((q) => [...q, { ...step, retry: true, kind: step.kind === "flashcard" ? "flashcard" : "typing" }]);
    return r.data;
  };

  const next = () => {
    setOutcome(null);
    setPos((p) => p + 1);
  };

  if (finished)
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <Celebrate good={!done.total || done.correct / done.total >= 0.6} />
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <PartyPopper className="size-8" aria-hidden />
        </div>
        <h1 className="text-[22px] font-bold">Mashg‘ulot yakunlandi</h1>
        <p className="mt-2 text-[15px] text-muted tabular">
          {done.total} ta javob · {done.total ? Math.round((100 * done.correct) / done.total) : 0}% to‘g‘ri
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <LinkButton href={backHref} variant="secondary">
            Lug‘atga qaytish
          </LinkButton>
          <Button onClick={() => location.reload()}>
            <RotateCcw /> Yana
          </Button>
        </div>
      </div>
    );

  return (
    <div className={cn("mx-auto max-w-xl", outcome && "pb-48 sm:pb-32")}>
      <div className="mb-5 flex items-center gap-3">
        <Link href={backHref} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text" aria-label="Chiqish">
          <ChevronLeft className="size-5" />
        </Link>
        <Progress value={(100 * pos) / total} className="flex-1" label="Mashg‘ulot jarayoni" />
        <span className="w-14 text-right text-[12.5px] text-muted tabular">
          {pos + 1}/{total}
        </span>
      </div>

      <section key={`${step.card.id}-${pos}`} className="animate-fade-up rounded-3xl border-2 border-border bg-surface p-6 sm:p-8">
        <CardTop card={step.card} label={step.retry ? "Qayta" : step.card.isNew ? "Yangi so‘z" : "Takrorlash"} />
        {step.kind === "flashcard" ? (
          <Flashcard card={step.card} busy={busy} onGrade={async (g) => (await record({ grade: g })) && next()} />
        ) : step.kind === "choice" ? (
          <Choice card={step.card} busy={busy} outcome={outcome} onAnswer={async (response) => { const r = await record({ response }); if (r) setOutcome(r); }} />
        ) : (
          <Typing card={step.card} busy={busy} outcome={outcome} onAnswer={async (response) => { const r = await record({ response }); if (r) setOutcome(r); }} />
        )}
      </section>
      {outcome ? (
        <div
          className={cn("fixed inset-x-0 bottom-0 z-[80] animate-slide-up border-t-2 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)]", outcome.correct ? "border-primary/30 bg-primary-soft" : "border-danger/30 bg-danger-soft")}
          role="status"
        >
          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className={cn("grid size-11 shrink-0 animate-pop place-items-center rounded-full text-white", outcome.correct ? "bg-primary" : "bg-danger")}>
                {outcome.correct ? <Check className="size-6" strokeWidth={3} /> : <X className="size-6" strokeWidth={3} />}
              </span>
              <div className="min-w-0 text-[15px]">
                <div className={cn("text-[19px] font-black", outcome.correct ? "text-primary-soft-fg" : "text-danger")}>{outcome.correct ? PRAISE[pos % PRAISE.length] : "To‘g‘ri javob:"}</div>
                <div className="text-text-2">
                  <b>{outcome.english}</b> — {outcome.uzbek}
                </div>
                {step.card.example ? <div className="mt-0.5 truncate text-[13.5px] text-muted italic">{step.card.example}</div> : null}
              </div>
            </div>
            <Button size="lg" variant={outcome.correct ? "primary" : "danger"} className="w-full sm:w-44" onClick={next} autoFocus>
              Davom etish <ArrowRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {}
}

function Pronounce({ card }: { card: SessionCard }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [tts, setTts] = useState(false);
  useEffect(() => setTts(typeof window !== "undefined" && "speechSynthesis" in window), []);
  if (card.audioFileId)
    return (
      <>
        <audio ref={audio} src={`/api/files/${card.audioFileId}`} preload="none" />
        <Button variant="soft" size="icon" onClick={() => audio.current?.play()} aria-label="Talaffuzni eshitish">
          <Volume2 />
        </Button>
      </>
    );
  if (!tts) return null;
  return (
    <Button variant="ghost" size="icon" onClick={() => speak(card.english)} aria-label="Talaffuz (brauzer ovozi)" title="Brauzer ovozi bilan talaffuz">
      <Volume2 />
    </Button>
  );
}

function CardTop({ card, label }: { card: SessionCard; label: string }) {
  const [fav, setFav] = useState(card.favorite);
  const [hard, setHard] = useState(card.difficult);
  const flag = async (f: "favorite" | "difficult", on: boolean) => {
    if (f === "favorite") setFav(on);
    else setHard(on);
    const r = await wordFlagAction(card.id, f, on);
    if (!r.ok) toast.error(r.error);
  };
  return (
    <div className="mb-6 flex items-center justify-between gap-2">
      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-bold tracking-[0.04em] text-muted uppercase">{label}</span>
      <div className="flex">
        <Button variant="ghost" size="icon" onClick={() => flag("difficult", !hard)} aria-pressed={hard} aria-label="Qiyin so‘z deb belgilash" className={hard ? "text-danger" : ""}>
          <TriangleAlert />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => flag("favorite", !fav)} aria-pressed={fav} aria-label="Sevimlilarga qo‘shish" className={fav ? "text-warning" : ""}>
          <Star className={fav ? "fill-current" : ""} />
        </Button>
      </div>
    </div>
  );
}

function WordHead({ card }: { card: SessionCard }) {
  return (
    <div className="text-center">
      {card.imageFileId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/${card.imageFileId}`} alt="" className="mx-auto mb-4 max-h-40 rounded-2xl object-contain" />
      ) : null}
      <div className="flex items-center justify-center gap-2">
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.02em]">{card.english}</h1>
        <Pronounce card={card} />
      </div>
      <div className="mt-1 text-[13.5px] text-muted">{[card.phonetic, card.partOfSpeech].filter(Boolean).join(" · ")}</div>
    </div>
  );
}

function Flashcard({ card, busy, onGrade }: { card: SessionCard; busy: boolean; onGrade: (g: 0 | 1 | 2 | 3) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <WordHead card={card} />
      {shown ? (
        <div className="mt-6 animate-fade-up space-y-4">
          <div className="rounded-2xl bg-surface-2 px-5 py-4 text-center">
            <div className="text-[20px] font-bold text-primary">{card.uzbek}</div>
            {card.example ? <div className="mt-2 text-[14px] text-text-2 italic">{card.example}</div> : null}
            {card.exampleUz ? <div className="mt-0.5 text-[13px] text-muted">{card.exampleUz}</div> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              [0, "Esladim emas", "border-danger/40 text-danger"],
              [1, "Qiyin", "border-warning/40 text-warning"],
              [2, "Esladim", "border-primary/40 text-primary"],
              [3, "Juda oson", "border-success/40 text-success"],
            ] as const).map(([g, l, c]) => (
              <button key={g} type="button" disabled={busy} onClick={() => onGrade(g)} className={cn("h-12 rounded-2xl border-2 border-b-4 bg-surface text-[14px] font-extrabold transition hover:bg-surface-2 active:translate-y-[2px] active:border-b-2 disabled:opacity-50", c)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Button size="lg" className="mt-8 w-full" onClick={() => setShown(true)}>
          Tarjimani ko‘rsatish
        </Button>
      )}
    </div>
  );
}

function Choice({ card, busy, outcome, onAnswer }: { card: SessionCard; busy: boolean; outcome: Outcome | null; onAnswer: (r: string) => void }) {
  const options = useMemo(() => [card.uzbek, ...card.distractors].sort(() => Math.random() - 0.5), [card]);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <WordHead card={card} />
      <p className="mt-6 mb-3 text-center text-[13px] text-muted">To‘g‘ri tarjimani tanlang</p>
      <div className="space-y-2.5">
        {options.map((o) => {
          const right = outcome && o === outcome.uzbek;
          const wrong = outcome && picked === o && !outcome.correct;
          return (
            <button
              key={o}
              type="button"
              disabled={busy || !!outcome}
              onClick={() => {
                setPicked(o);
                onAnswer(o);
              }}
              className={cn(
                "w-full rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left text-[16px] font-bold transition active:translate-y-[2px] active:border-b-2",
                right ? "border-success bg-success-soft" : wrong ? "border-danger bg-danger-soft" : "border-border bg-surface hover:border-border-strong hover:bg-surface-2",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {options.length < 2 ? <p className="mt-2 text-[12.5px] text-muted">Variantlar kam — ro‘yxatda boshqa so‘zlar qo‘shilgach to‘liq test bo‘ladi.</p> : null}
    </div>
  );
}

function Typing({ card, busy, outcome, onAnswer }: { card: SessionCard; busy: boolean; outcome: Outcome | null; onAnswer: (r: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim() && !outcome) onAnswer(v);
      }}
    >
      <div className="text-center">
        <p className="text-[13px] text-muted">Inglizcha yozing</p>
        <h1 className="mt-1 text-[26px] leading-tight font-bold">{card.uzbek}</h1>
        {card.exampleUz ? <p className="mt-2 text-[13.5px] text-muted">{card.exampleUz}</p> : null}
      </div>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        disabled={busy || !!outcome}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Inglizcha so‘z"
        className={cn(
          "mt-6 h-14 w-full rounded-2xl border bg-surface px-4 text-center text-[20px] font-bold focus:ring-4 focus:ring-[var(--ring)] focus:outline-none",
          outcome ? (outcome.correct ? "border-success" : "border-danger") : "border-border-strong focus:border-primary",
        )}
      />
      {!outcome ? (
        <Button type="submit" size="lg" className="mt-4 w-full" disabled={!v.trim()} loading={busy}>
          Tekshirish
        </Button>
      ) : null}
    </form>
  );
}

/** Match up to five words with their meanings; the first try per pair is what gets recorded. */
function MatchBoard({ cards, backHref }: { cards: SessionCard[]; backHref: string }) {
  const rounds = useMemo(() => {
    const out: SessionCard[][] = [];
    for (let i = 0; i < cards.length; i += 5) out.push(cards.slice(i, i + 5));
    return out;
  }, [cards]);
  const [round, setRound] = useState(0);
  const set = useMemo(() => rounds[round] ?? [], [rounds, round]);
  const right = useMemo(() => [...set].sort(() => Math.random() - 0.5), [set]);
  const [left, setLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0 });

  const pick = async (rightId: string) => {
    if (!left) return;
    const ok = left === rightId;
    const first = !missed.includes(left);
    if (ok) {
      setMatched((m) => [...m, left]);
      play("correct");
      const r = await recordReviewAction({ wordId: left, kind: "match", matched: first });
      if (!r.ok) toast.error(r.error);
      setStats((s) => ({ total: s.total + 1, correct: s.correct + (first ? 1 : 0) }));
      setLeft(null);
    } else {
      setMissed((m) => (m.includes(left) ? m : [...m, left]));
      play("wrong");
      setWrongFlash(rightId);
      setTimeout(() => setWrongFlash(null), 450);
    }
  };

  if (round >= rounds.length)
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <Celebrate good={!stats.total || stats.correct / stats.total >= 0.6} />
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <PartyPopper className="size-8" aria-hidden />
        </div>
        <h1 className="text-[22px] font-bold">Moslash yakunlandi</h1>
        <p className="mt-2 text-[15px] text-muted tabular">
          {stats.correct} / {stats.total} birinchi urinishda
        </p>
        <LinkButton href={backHref} variant="secondary" className="mt-6">
          Lug‘atga qaytish
        </LinkButton>
      </div>
    );

  const roundDone = matched.length === set.length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <Link href={backHref} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text" aria-label="Chiqish">
          <ChevronLeft className="size-5" />
        </Link>
        <Progress value={(100 * round) / rounds.length} className="flex-1" label="Moslash jarayoni" />
      </div>
      <p className="mb-4 text-center text-[13.5px] text-muted">Chapdan so‘zni, o‘ngdan uning ma’nosini tanlang</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2.5">
          {set.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={matched.includes(c.id)}
              onClick={() => setLeft(c.id)}
              className={cn(
                "h-14 w-full rounded-2xl border-2 border-b-4 px-3 text-[15px] font-extrabold transition active:translate-y-[2px] active:border-b-2",
                matched.includes(c.id) ? "border-success/30 bg-success-soft text-success opacity-70" : left === c.id ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              {c.english}
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {right.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={matched.includes(c.id) || !left}
              onClick={() => pick(c.id)}
              className={cn(
                "h-14 w-full rounded-2xl border-2 border-b-4 px-3 text-[14.5px] font-bold transition disabled:cursor-default active:translate-y-[2px] active:border-b-2",
                matched.includes(c.id) ? "border-success/30 bg-success-soft text-success opacity-70" : wrongFlash === c.id ? "border-danger bg-danger-soft" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              {c.uzbek}
            </button>
          ))}
        </div>
      </div>
      {roundDone ? (
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            setRound((r) => r + 1);
            setMatched([]);
            setMissed([]);
          }}
        >
          Davom etish <ArrowRight />
        </Button>
      ) : null}
    </div>
  );
}

const PRAISE = ["Barakalla!", "Zo‘r!", "Ajoyib!", "To‘g‘ri!", "Super!", "Davom eting!"];

function Celebrate({ good }: { good: boolean }) {
  useEffect(() => {
    play(good ? "complete" : "tap");
  }, [good]);
  return good ? <Confetti /> : null;
}
