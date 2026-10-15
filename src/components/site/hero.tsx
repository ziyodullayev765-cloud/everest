"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, MapPin } from "lucide-react";
import { HeroVisual } from "@/components/three/hero-visual";
import { buttonClass } from "@/components/ui/button";

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
  const item = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 1.1, delay: 0.15 + i * 0.09, ease },
        };

  const words = p.title.split(/\s+/).filter(Boolean);

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-28 pb-16 sm:pt-32">
      <div className="container-x grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-4">
        <div className="relative z-10 order-2 lg:order-1">
          {(p.availability || p.eyebrow) && (
            <motion.div {...item(0)} className="mb-7 flex flex-wrap items-center gap-3">
              {p.availability ? (
                <span className="glass text-fg/90 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium">
                  <span className="relative flex size-2">
                    <span className="bg-accent absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden" />
                    <span className="bg-accent relative inline-flex size-2 rounded-full" />
                  </span>
                  {p.availability}
                </span>
              ) : (
                <span className="text-accent font-mono text-xs tracking-[0.25em] uppercase">{p.eyebrow}</span>
              )}
              {p.location && (
                <span className="text-subtle inline-flex items-center gap-1.5 text-xs">
                  <MapPin className="size-3.5" aria-hidden />
                  {p.location}
                </span>
              )}
            </motion.div>
          )}

          <h1 className="text-[clamp(2.9rem,9vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.055em]">
            {words.map((w, i) => (
              <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className="text-gradient inline-block"
                  {...(reduce
                    ? {}
                    : {
                        initial: { y: "105%" },
                        animate: { y: "0%" },
                        transition: { duration: 1.2, delay: 0.1 + i * 0.12, ease },
                      })}
                >
                  {w}
                  {i < words.length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </h1>

          {p.headline && (
            <motion.p {...item(2)} className="text-fg/90 mt-6 text-xl font-medium tracking-tight sm:text-2xl">
              {p.headline}
            </motion.p>
          )}
          {p.description && (
            <motion.p {...item(3)} className="text-muted mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
              {p.description}
            </motion.p>
          )}

          <motion.div {...item(4)} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/projects" className={buttonClass("primary", "lg")}>
              {p.primaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="/contact" className={buttonClass("secondary", "lg")}>
              {p.secondaryLabel}
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="relative order-1 mx-auto w-full max-w-[min(78vw,420px)] lg:order-2 lg:max-w-none"
          {...(reduce
            ? {}
            : { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1.6, ease } })}
        >
          <HeroVisual accent={p.accent} enabled={p.enable3d} particles={p.particles} />
        </motion.div>
      </div>

      <a
        href="#highlights"
        className="text-subtle hover:text-fg absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full px-3 py-2 text-xs transition sm:flex"
        aria-label="Pastga aylantirish"
      >
        <ArrowDown className="size-4 motion-safe:animate-bounce" aria-hidden />
      </a>
    </section>
  );
}
