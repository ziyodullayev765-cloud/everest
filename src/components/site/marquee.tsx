import { cn } from "@/lib/utils";

/** Infinite, colourful ticker band. Pauses on hover; static under reduced motion (via global CSS). */
export function Marquee({
  items,
  reverse = false,
  duration = 35,
  className,
  tilt = 0,
  tone = "light",
}: {
  items: string[];
  reverse?: boolean;
  duration?: number;
  className?: string;
  tilt?: number;
  /** "dark" = black type, for use on bright colour blocks. */
  tone?: "light" | "dark";
}) {
  if (!items.length) return null;
  const COLORS = ["var(--accent)", "var(--c-pink)", "var(--c-amber)", "var(--c-cyan)", "var(--c-lime)"];
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={`${t}-${i}`} className="flex items-center gap-8">
          <span
            className={cn(
              "font-display text-[clamp(2rem,6vw,5rem)] leading-none whitespace-nowrap",
              tone === "dark"
                ? i % 2
                  ? "text-transparent [-webkit-text-stroke:1.5px_rgba(0,0,0,0.75)]"
                  : "text-black"
                : i % 2
                  ? "text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.55)]"
                  : "text-white",
            )}
          >
            {t}
          </span>
          <span
            className="text-[clamp(1.5rem,4vw,3rem)] leading-none"
            style={{ color: tone === "dark" ? "#000" : COLORS[i % COLORS.length] }}
            aria-hidden
          >
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div
      className={cn("group relative overflow-hidden py-6", className)}
      style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <div
        className="animate-marquee flex w-max group-hover:[animation-play-state:paused]"
        style={{ ["--marquee-duration" as string]: `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
