"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkAchievements } from "@/components/student/achievement-unlock";
import Link from "next/link";
import { Flame, Gamepad2, RotateCcw, Trophy, Volume2, VolumeX, X, Zap } from "lucide-react";
import type { GameCard } from "@/server/services/vocabulary";
import { finishGameAction } from "@/app/actions/vocab";
import { Button, LinkButton } from "@/components/ui/button";
import { Confetti } from "@/components/app/confetti";
import { toast } from "@/components/ui/toast";
import { GAME_SECONDS, pointsFor } from "@/lib/game";
import { buzz, play, setSoundOn, soundOn } from "@/lib/sfx";
import { cn } from "@/lib/utils";

const TILES = [
  "bg-[#e5484d] shadow-[0_5px_0_0_#a8282d]",
  "bg-[#1a96e0] shadow-[0_5px_0_0_#0f6ea8]",
  "bg-[#f5a90a] shadow-[0_5px_0_0_#b37800]",
  "bg-[#1ea55a] shadow-[0_5px_0_0_#137a40]",
];

type Answer = { wordId: string; correct: boolean; ms: number };
type Phase = "intro" | "play" | "done";

export function VocabGame({ cards, listId, best, backHref }: { cards: GameCard[]; listId: string | null; best: number; backHref: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gain, setGain] = useState<number | null>(null);
  const [left, setLeft] = useState(GAME_SECONDS * 1000);
  const [sound, setSound] = useState(true);
  const [result, setResult] = useState<{ score: number; correct: number; total: number; bestStreak: number; best: number; newBest: boolean } | null>(null);
  const started = useRef(0);
  const card = cards[i];

  useEffect(() => setSound(soundOn()), []);

  const finish = useCallback(
    async (all: Answer[]) => {
      setPhase("done");
      const r = await finishGameAction({ listId, answers: all });
      if (r.ok) {
        setResult(r.data);
        play("complete");
        setTimeout(checkAchievements, 2500);
      } else toast.error(r.error);
    },
    [listId],
  );

  const answer = useCallback(
    (option: string | null) => {
      if (picked !== null || !card) return;
      const ms = Math.round(performance.now() - started.current);
      const correct = option === card.answer;
      setPicked(option ?? "__timeout__");
      const pts = pointsFor({ correct, ms }, streak);
      if (correct) {
        play(streak >= 2 ? "combo" : "correct");
        setScore((s) => s + pts);
        setStreak((s) => s + 1);
        setGain(pts);
      } else {
        play("wrong");
        buzz(60);
        setStreak(0);
        setGain(null);
      }
      const next = [...answers, { wordId: card.id, correct, ms }];
      setAnswers(next);
      setTimeout(() => {
        setPicked(null);
        setGain(null);
        if (i + 1 >= cards.length) void finish(next);
        else {
          setI(i + 1);
          started.current = performance.now();
          setLeft(GAME_SECONDS * 1000);
        }
      }, correct ? 750 : 1400);
    },
    [picked, card, streak, answers, i, cards.length, finish],
  );

  // Countdown for the current question.
  useEffect(() => {
    if (phase !== "play" || picked !== null) return;
    const t = setInterval(() => {
      const l = GAME_SECONDS * 1000 - (performance.now() - started.current);
      setLeft(Math.max(0, l));
      if (l <= 3000 && l > 2900) play("tick");
      if (l <= 0) answer(null);
    }, 100);
    return () => clearInterval(t);
  }, [phase, picked, answer]);

  if (cards.length < 2)
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-sun/20 text-warning">
          <Gamepad2 className="size-8" aria-hidden />
        </div>
        <h1 className="text-[22px] font-black">O‘yin uchun so‘z yetarli emas</h1>
        <p className="mt-2 text-[14.5px] text-muted">Kamida 2 ta so‘z kerak. Ustozingiz lug‘at ro‘yxatini biriktirgach o‘ynash mumkin.</p>
        <LinkButton href={backHref} variant="secondary" className="mt-6">
          Orqaga
        </LinkButton>
      </div>
    );

  if (phase === "intro")
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
        <div className="mb-5 grid size-24 animate-pop place-items-center rounded-[28px] bg-sun text-white shadow-[0_6px_0_0_var(--sun-shadow)]">
          <Gamepad2 className="size-12" aria-hidden />
        </div>
        <h1 className="text-[30px] leading-tight font-black">So‘z o‘yini</h1>
        <p className="mt-2 text-[15px] text-muted">
          {cards.length} ta savol · har biriga {GAME_SECONDS} soniya. Tez va to‘g‘ri javob — ko‘proq ball, ketma-ket to‘g‘ri javoblar — bonus!
        </p>
        {best ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sun/15 px-3 py-1 text-[13.5px] font-bold text-warning">
            <Trophy className="size-4" aria-hidden /> Rekordingiz: {best.toLocaleString("en")}
          </p>
        ) : null}
        <Button
          size="lg"
          className="mt-8 w-full max-w-xs text-[18px]"
          onClick={() => {
            play("start");
            started.current = performance.now();
            setPhase("play");
          }}
        >
          Boshlash
        </Button>
        <div className="mt-4 flex gap-2">
          <LinkButton href={backHref} variant="ghost" size="sm">
            Orqaga
          </LinkButton>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSoundOn(!sound);
              setSound(!sound);
            }}
            aria-pressed={sound}
          >
            {sound ? <Volume2 /> : <VolumeX />} Ovoz {sound ? "yoqilgan" : "o‘chirilgan"}
          </Button>
        </div>
      </div>
    );

  if (phase === "done") {
    const total = answers.length;
    const right = answers.filter((a) => a.correct).length;
    const missed = cards.filter((c) => answers.some((a) => a.wordId === c.id && !a.correct));
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        {right / total >= 0.6 ? <Confetti /> : null}
        <div className="mx-auto mb-4 grid size-20 animate-pop place-items-center rounded-[26px] bg-sun text-white shadow-[0_6px_0_0_var(--sun-shadow)]">
          <Trophy className="size-10" aria-hidden />
        </div>
        <h1 className="text-[26px] font-black">{right === total ? "Mukammal!" : right / total >= 0.6 ? "Zo‘r o‘yin!" : "Yaxshi urinish!"}</h1>
        {result?.newBest ? <p className="mt-1 animate-pop text-[15px] font-extrabold text-warning">Yangi rekord!</p> : null}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Stat label="Ball" value={(result?.score ?? score).toLocaleString("en")} />
          <Stat label="To‘g‘ri" value={`${right}/${total}`} />
          <Stat label="Seriya" value={result?.bestStreak ?? "—"} />
        </div>
        {missed.length ? (
          <div className="mt-6 rounded-3xl border-2 border-border bg-surface p-4 text-left">
            <div className="mb-2 text-[13px] font-extrabold text-muted">Takrorlash kerak</div>
            <ul className="space-y-1.5">
              {missed.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 text-[14.5px]">
                  <span className="font-bold">{m.direction === "en_uz" ? m.prompt : m.answer}</span>
                  <span className="text-text-2">{m.direction === "en_uz" ? m.answer : m.prompt}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-8 flex justify-center gap-2">
          <LinkButton href={backHref} variant="secondary">
            Lug‘at
          </LinkButton>
          <Button onClick={() => location.reload()}>
            <RotateCcw /> Yana o‘ynash
          </Button>
        </div>
      </div>
    );
  }

  const pct = (left / (GAME_SECONDS * 1000)) * 100;
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href={backHref} className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label="Chiqish">
          <X className="size-5" />
        </Link>
        <div className="flex-1 text-[13px] font-extrabold text-muted tabular">
          {i + 1} / {cards.length}
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[14px] font-black tabular", streak >= 2 ? "bg-warning-soft text-warning" : "text-muted")}>
          <Flame className="size-4" aria-hidden /> {streak}
        </span>
        <span className="relative inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-[15px] font-black text-primary-soft-fg tabular">
          <Zap className="size-4" aria-hidden /> {score.toLocaleString("en")}
          {gain ? <span className="absolute -top-6 right-0 animate-pop text-[14px] font-black text-primary">+{gain}</span> : null}
        </span>
      </div>
      <div className="mb-5 h-3 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-label="Qolgan vaqt" aria-valuenow={Math.round(pct)}>
        <div className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", pct > 50 ? "bg-primary" : pct > 25 ? "bg-sun" : "bg-danger")} style={{ width: `${pct}%` }} />
      </div>

      <section key={card.id} className="animate-pop rounded-3xl border-2 border-border bg-surface px-6 py-8 text-center">
        <div className="text-[12.5px] font-extrabold tracking-[0.06em] text-muted uppercase">{card.direction === "en_uz" ? "Tarjimasini toping" : "Inglizchasini toping"}</div>
        <div className="mt-2 text-[32px] leading-tight font-black break-words">{card.prompt}</div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {card.options.map((o, k) => {
          const isAnswer = picked !== null && o === card.answer;
          const isWrongPick = picked === o && o !== card.answer;
          return (
            <button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => answer(o)}
              className={cn(
                "min-h-24 rounded-3xl px-3 py-4 text-[16.5px] leading-snug font-extrabold break-words text-white transition active:translate-y-[3px] active:shadow-none",
                TILES[k % TILES.length],
                picked !== null && !isAnswer && !isWrongPick && "opacity-40",
                isAnswer && "ring-4 ring-primary ring-offset-2 ring-offset-bg",
                isWrongPick && "animate-shake",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked === "__timeout__" ? <p className="mt-4 text-center text-[14px] font-bold text-danger">Vaqt tugadi! To‘g‘ri javob: {card.answer}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-surface px-3 py-3">
      <div className="text-[12px] font-bold text-muted">{label}</div>
      <div className="text-[22px] font-black tabular">{value}</div>
    </div>
  );
}
