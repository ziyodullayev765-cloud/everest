"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { markAchievementsSeenAction } from "@/app/actions/student";
import { categoryOf } from "@/lib/achievements";
import { formatDate } from "@/lib/dates";
import { play } from "@/lib/sfx";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/app/confetti";
import { Medal } from "./medal";
import { tr } from "@/lib/i18n/tr";

type Unlock = { code: string; title: string; description: string; icon: string; category: string; xpReward: number; earnedAt: string };

/** Fire after an action that may unlock something without navigating (e.g. end of a word game). */
export const checkAchievements = () => window.dispatchEvent(new Event("achievements:check"));

/** Celebrates newly unlocked achievements once: medal, name, date and XP, with confetti and sound. */
export function AchievementUnlock() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<Unlock[]>([]);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/achievements/unseen", { cache: "no-store" });
      const data: Unlock[] = res.ok ? await res.json() : [];
      if (data.length) setQueue((q) => (q.length ? q : data));
    } catch {
      // Offline or signed out: try again on the next page.
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    // Don't interrupt a running quiz.
    if (/\/attempt\//.test(pathname)) return;
    void check();
  }, [pathname, check]);

  useEffect(() => {
    const h = () => setTimeout(() => void check(), 600);
    window.addEventListener("achievements:check", h);
    return () => window.removeEventListener("achievements:check", h);
  }, [check]);

  const a = queue[0];
  useEffect(() => {
    if (a) play("complete");
  }, [a]);

  if (!a) return null;
  const c = categoryOf(a.category);
  const next = () => {
    void markAchievementsSeenAction([a.code]);
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ach-title">
      <Confetti key={a.code} />
      <div className="w-full max-w-sm animate-pop overflow-hidden rounded-[28px] bg-surface text-center shadow-pop">
        <div className="relative bg-gradient-to-b from-[#0d5c3a] to-[#0f6e45] px-6 pt-7 pb-6 text-white">
          <span aria-hidden className="pointer-events-none absolute top-10 left-1/2 size-48 -translate-x-1/2 rounded-full bg-white/15 blur-2xl" />
          <div className="relative text-[12px] font-extrabold tracking-[0.18em] text-white/80 uppercase">{tr("Yangi yutuq!")}</div>
          <div className="relative mx-auto mt-3 w-fit">
            <Medal icon={a.icon} category={a.category} size={112} />
          </div>
          <h2 id="ach-title" className="relative mt-3 text-[24px] leading-tight font-black">{a.title}</h2>
          <p className="relative text-[13px] font-semibold text-white/80">{c.label}</p>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-[14.5px] font-semibold text-text-2">{a.description}</p>
          <div className="flex items-center justify-center gap-4 text-[13px]">
            {a.xpReward > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf1dc] px-3 py-1.5 font-black text-[#9a6a00]">
                <Star className="size-4 fill-[#f5b50b] text-[#f5b50b]" aria-hidden /> {tr("+{0} XP", a.xpReward)}
              </span>
            ) : null}
            <span className="font-semibold text-muted">{formatDate(a.earnedAt)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={next} autoFocus>
              {queue.length > 1 ? tr("Keyingisi") : tr("Ajoyib!")}
            </Button>
            <Link href="/achievements" onClick={next} className="text-[13.5px] font-extrabold text-primary">
              {tr("Barcha yutuqlar")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Drop into a "finished" screen: asks for new unlocks a moment after it appears. */
export function CheckAchievementsLater({ delay = 1800 }: { delay?: number }) {
  useEffect(() => {
    const t = setTimeout(checkAchievements, delay);
    return () => clearTimeout(t);
  }, [delay]);
  return null;
}
