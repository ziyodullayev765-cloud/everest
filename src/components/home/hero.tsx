import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { DomeTileData } from "@/components/site/dome-gallery";
import { EdMarquee } from "@/components/site/ed-marquee";
import { ScrambleText } from "@/components/site/scramble-text";
import { DomeHero } from "./dome-hero";

/**
 * First screen: the photo dome fills it edge to edge with the name and
 * subtitle over its lower rim (like an editorial cover). The calls to action
 * and the ticker sit just below the fold.
 */
export function Hero({
  name,
  subtitle,
  primaryLabel,
  secondaryLabel,
  scrollLabel,
  ticker,
  tiles,
  animateDome,
}: {
  name: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  scrollLabel: string;
  ticker: string[];
  tiles: DomeTileData[];
  animateDome: boolean;
}) {
  return (
    <section aria-label={name} className="relative">
      <div className="relative h-[84svh] min-h-[540px] overflow-hidden sm:h-[100svh] sm:min-h-[560px]">
        <DomeHero tiles={tiles} animate={animateDome} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-[7svh] text-center">
          <ScrambleText
            as="h1"
            text={name}
            className="ed-name pointer-events-auto text-[clamp(1.55rem,6.2vw,5.4rem)] whitespace-nowrap"
          />
          {subtitle && (
            <p className="pointer-events-auto mx-auto mt-4 max-w-[46rem] text-[clamp(0.95rem,1.7vw,1.25rem)] leading-[1.65] text-[var(--fg-secondary)]">
              {subtitle}
            </p>
          )}
          <a
            href="#start"
            className="text-muted hover:text-fg pointer-events-auto mt-6 inline-flex items-center gap-2 text-[0.68rem] tracking-[0.24em] uppercase transition"
          >
            <ArrowDown className="size-3.5 motion-safe:animate-bounce" aria-hidden />
            {scrollLabel}
          </a>
        </div>
      </div>

      <div id="start" className="flex scroll-mt-28 flex-wrap justify-center gap-3 px-4 pt-14 pb-12">
        <Link href="#projects" className="ed-button ed-button--accent group">
          {primaryLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <Link href="#contact" className="ed-button">
          {secondaryLabel}
        </Link>
      </div>
      <EdMarquee items={ticker} />
    </section>
  );
}
