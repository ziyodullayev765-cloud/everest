import type { CSSProperties } from "react";

/**
 * The hero name, set in the display serif. Each letter rises out of a soft
 * blur in turn; the surname follows in italic. Pure CSS (server-rendered, no
 * hydration flash), and reduced-motion users get the text straight away via
 * the global reduced-motion rule. Screen readers read the whole name once.
 */
export function NameReveal({ text, className }: { text: string; className?: string }) {
  const words = text.trim().split(/\s+/);
  let n = 0;
  return (
    <h1 className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((word, w) => (
          <span key={w} className={w > 0 ? "ed-name-tail" : undefined}>
            {w > 0 && " "}
            {[...word].map((ch, i) => (
              <span key={i} className="ed-name-letter" style={{ "--i": n++ } as CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        ))}
      </span>
    </h1>
  );
}
