"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDownRight, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { HeroVisual } from "@/components/three/hero-visual";
import { Magnetic } from "@/components/effects/magnetic";
import { PlayfulText } from "./playful-text";
import { isPlaceholder } from "@/lib/defaults";

interface Props {
  eyebrow: string;
  title: string;
  headline: string;
  description: string;
  availability: string;
  location: string;
  primaryLabel: string;
  secondaryLabel: string;
  accent: string;
  enable3d: boolean;
  particles: boolean;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero(p: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const textY = useTransform(scrollY, [0, 800], [0, -140]);
  const visualY = useTransform(scrollY, [0, 800], [0, 160]);
  const fade = useTransform(scrollY, [0, 600], [1, 0]);

  const fadeIn = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 1, delay: 0.5 + i * 0.1, ease },
        };

  const [first, ...rest] = p.title.split(/\s+/);
  const last = rest.join(" ");
  const headline = isPlaceholder(p.headline) ? "" : p.headline;
  const description = isPlaceholder(p.description) ? "" : p.description;

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden pt-28 pb-10 sm:pb-14">
      {/* 3D centrepiece behind the type */}
      <motion.div
        style={reduce ? undefined : { y: visualY }}
        className="pointer-events-auto absolute top-[6%] right-[-25%] -z-10 w-[min(110vw,640px)] sm:right-[-8%] lg:top-[3%] lg:right-[1%] lg:w-[min(46vw,720px)]"
        {...(reduce
          ? {}
          : { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1.8, ease } })}
      >
        <HeroVisual accent={p.accent} enabled={p.enable3d} particles={p.particles} />
      </motion.div>

      <motion.div style={reduce ? undefined : { y: textY, opacity: fade }} className="container-x relative">
        <motion.div {...fadeIn(0)} className="mb-6 flex flex-wrap items-center gap-3">
          {p.availability ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium ring-1 ring-white/10 backdrop-blur">
              <span className="relative flex size-2">
                <span className="bg-lime absolute inline-flex size-full animate-ping rounded-full opacity-70 motion-reduce:hidden" />
                <span className="bg-lime relative inline-flex size-2 rounded-full" />
              </span>
              {p.availability}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-white/60 uppercase">
              <Sparkles className="text-amber size-3.5" aria-hidden />
              {p.eyebrow || "Portfolio"}
            </span>
          )}
          {p.location && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <MapPin className="size-3.5" aria-hidden />
              {p.location}
            </span>
          )}
        </motion.div>

        <h1 className="font-display text-[clamp(2.1rem,8.4vw,8.5rem)] leading-[0.92] tracking-[-0.04em] [overflow-wrap:anywhere] drop-shadow-[0_6px_30px_rgba(7,6,11,0.55)]">
          <PlayfulText text={first ?? ""} className="block" />
          {last && <PlayfulText text={last} className="text-rainbow block" delay={0.25} />}
        </h1>

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-xl">
            {headline && (
              <motion.p {...fadeIn(2)} className="text-xl font-medium tracking-tight sm:text-2xl">
                {headline}
              </motion.p>
            )}
            {description && (
              <motion.p {...fadeIn(3)} className="mt-3 text-base leading-relaxed text-white/60 sm:text-lg">
                {description}
              </motion.p>
            )}
          </div>

          <motion.div {...fadeIn(4)} className="flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link
                href="/projects"
                className="bg-rainbow group inline-flex h-14 items-center gap-2 rounded-full px-7 text-base font-semibold text-white shadow-[0_12px_40px_-10px_var(--accent)] transition-transform hover:scale-[1.04]"
              >
                {p.primaryLabel}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                href="/contact"
                className="inline-flex h-14 items-center gap-2 rounded-full bg-white/[0.04] px-7 text-base font-medium ring-1 ring-white/20 backdrop-blur transition hover:bg-white hover:text-black"
              >
                {p.secondaryLabel}
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        <motion.a
          {...fadeIn(6)}
          href="#highlights"
          className="mt-12 hidden items-center gap-3 text-xs tracking-[0.3em] text-white/40 uppercase transition hover:text-white sm:inline-flex"
        >
          <span className="grid size-9 place-items-center rounded-full ring-1 ring-white/20">
            <ArrowDownRight className="size-4 motion-safe:animate-bounce" aria-hidden />
          </span>
          Pastga aylantiring
        </motion.a>
      </motion.div>
    </section>
  );
}
