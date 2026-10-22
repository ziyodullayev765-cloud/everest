"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

const TRIGGER = 72; // px of pull needed to refresh
const MAX = 120;

/**
 * Native-style pull to refresh: when the page is scrolled to the top, dragging down shows a spinner
 * under the (sticky) top bar; releasing past the threshold reloads the page's data. The browser's own
 * pull-to-refresh/overscroll is turned off (globals.css) so it behaves the same on every phone.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, startRefresh] = useTransition();
  const [spinning, setSpinning] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const blocked = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("dialog[open], [role='dialog'], [data-no-pull], input, textarea, select, canvas");
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || e.touches.length !== 1 || blocked(e.target)) return void (start.current = null);
      start.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        if (pullRef.current) setPull((pullRef.current = 0));
        return;
      }
      // Resistance: the further you pull, the harder it gets.
      const d = Math.min(MAX, dy * 0.5);
      pullRef.current = d;
      setPull(d);
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (start.current == null) return;
      start.current = null;
      const d = pullRef.current;
      pullRef.current = 0;
      setPull(0);
      if (d >= TRIGGER) {
        setSpinning(true);
        navigator.vibrate?.(10);
        startRefresh(() => router.refresh());
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  // Keep the spinner up until the refresh has finished (and at least briefly, so it never just flickers).
  useEffect(() => {
    if (!spinning || refreshing) return;
    const t = setTimeout(() => setSpinning(false), 350);
    return () => clearTimeout(t);
  }, [spinning, refreshing]);

  const visible = pull > 0 || spinning;
  const ratio = Math.min(1, pull / TRIGGER);
  const y = spinning ? 56 : pull;
  return (
    <div
      aria-hidden={!spinning}
      role={spinning ? "status" : undefined}
      aria-label={spinning ? tr("Yangilanmoqda") : undefined}
      className={cn("pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+56px)] z-30 flex justify-center lg:hidden", !visible && "invisible")}
    >
      <div
        className={cn("grid size-10 place-items-center rounded-full border border-border bg-surface shadow-pop", pull === 0 && "transition-transform duration-200")}
        style={{ transform: `translateY(${y - 44}px) scale(${spinning ? 1 : 0.6 + ratio * 0.4})`, opacity: spinning ? 1 : ratio }}
      >
        <RefreshCw
          className={cn("size-5 text-primary", spinning && "animate-spin")}
          style={spinning ? undefined : { transform: `rotate(${ratio * 270}deg)`, opacity: ratio >= 1 ? 1 : 0.6 }}
        />
      </div>
    </div>
  );
}
