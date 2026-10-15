"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Headphones, VolumeX } from "lucide-react";
import { useSound } from "./sound";

const KEY = "portfolio-entered";

/**
 * Award-site style intro: a 0→100 counter, the owner's name, then a choice to
 * enter with or without sound (the click is the user gesture audio needs).
 * Shown once per browser session. Server-rendered so there is no flash; a
 * tiny inline script hides it immediately for returning visitors, and it is
 * hidden for visitors without JavaScript.
 */
export function Preloader({ name }: { name: string }) {
  const sound = useSound();
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) {
      setShow(false);
      return;
    }
    document.documentElement.style.overflow = "hidden";
    if (reduce) {
      setCount(100);
      return;
    }
    const start = performance.now();
    const DURATION = 1700;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / DURATION);
      setCount(Math.round((1 - Math.pow(1 - k, 3)) * 100));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const enter = (withSound: boolean) => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    if (withSound) sound?.start();
    document.documentElement.style.overflow = "";
    setShow(false);
  };

  const ready = count >= 100;
  const letters = name.split("");

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("${KEY}"))document.documentElement.setAttribute("data-entered","")}catch(e){}`,
        }}
      />
      <noscript>
        <style>{`.preloader{display:none!important}`}</style>
      </noscript>
      <style>{`[data-entered] .preloader{display:none!important}`}</style>
      <AnimatePresence>
        {show && (
          <motion.div
            key="preloader"
            className="preloader bg-bg fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden px-6"
            initial={{ y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "-100%" }}
            transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Saytga kirish"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div
                className="animate-aurora-a absolute top-1/4 left-1/4 size-[50vmax] rounded-full opacity-40 blur-[120px]"
                style={{ background: "radial-gradient(circle, var(--accent), transparent 60%)" }}
              />
              <div
                className="animate-aurora-b absolute right-1/4 bottom-1/4 size-[45vmax] rounded-full opacity-30 blur-[120px]"
                style={{ background: "radial-gradient(circle, var(--c-pink), transparent 60%)" }}
              />
            </div>

            <p className="font-display relative text-center text-[clamp(2rem,8vw,6rem)] leading-none tracking-tight">
              {letters.map((ch, i) => (
                <motion.span
                  key={i}
                  className="text-rainbow inline-block"
                  initial={reduce ? false : { y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * i, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  {ch === " " ? " " : ch}
                </motion.span>
              ))}
            </p>

            <div className="relative mt-10 h-28 w-full max-w-md">
              <AnimatePresence mode="wait">
                {!ready ? (
                  <motion.div key="count" exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center gap-4">
                    <span className="font-display text-5xl tabular-nums">{count}</span>
                    <div className="h-[2px] w-56 overflow-hidden rounded-full bg-white/10">
                      <div className="bg-rainbow h-full" style={{ width: `${count}%` }} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="enter"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
                  >
                    <button
                      type="button"
                      autoFocus
                      onClick={() => enter(true)}
                      className="bg-rainbow inline-flex h-12 items-center gap-2 rounded-full px-6 font-medium text-white shadow-[0_10px_40px_-10px_var(--accent)] transition hover:scale-105"
                    >
                      <Headphones className="size-4" aria-hidden />
                      Ovoz bilan kirish
                    </button>
                    <button
                      type="button"
                      onClick={() => enter(false)}
                      className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-white/70 ring-1 ring-white/15 transition hover:text-white hover:ring-white/40"
                    >
                      <VolumeX className="size-4" aria-hidden />
                      Ovozsiz
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
