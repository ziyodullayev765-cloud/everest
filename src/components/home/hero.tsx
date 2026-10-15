import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { EdMarquee } from "@/components/site/ed-marquee";
import { ScrambleText } from "@/components/site/scramble-text";

/**
 * Name, subtitle and calls to action, laid over the lower part of the 3D dome
 * (the dome itself lives in HomeBackdrop so it can stay fixed behind the page).
 */
export function Hero({
  name,
  subtitle,
  primaryLabel,
  secondaryLabel,
  ticker,
}: {
  name: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  ticker: string[];
}) {
  return (
    <section aria-labelledby="hero-title" className="relative">
      {/* Leaves the top of the first screen to the draggable dome. */}
      <div className="pointer-events-none flex flex-col items-center px-4 pt-[50svh] text-center">
        <div className="pointer-events-auto max-w-4xl">
          <ScrambleText as="h1" text={name} className="ed-heading text-[clamp(2.4rem,7.2vw,5.5rem)] leading-[1.04]" />
          {subtitle && (
            <p className="mx-auto mt-6 max-w-2xl text-[clamp(1rem,2.1vw,1.2rem)] leading-[1.7] text-[var(--fg-secondary)]">
              {subtitle}
            </p>
          )}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="#projects" className="ed-button ed-button--accent group">
              {primaryLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="#contact" className="ed-button">
              {secondaryLabel}
            </Link>
          </div>
          <a
            href="#projects"
            className="text-muted hover:text-fg mt-10 inline-flex items-center gap-2 text-[0.7rem] tracking-[0.22em] uppercase transition"
          >
            <ArrowDown className="size-3.5 motion-safe:animate-bounce" aria-hidden />
            Scroll
          </a>
        </div>
      </div>
      <div className="mt-12">
        <EdMarquee items={ticker} />
      </div>
    </section>
  );
}
