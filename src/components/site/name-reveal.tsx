import type { CSSProperties } from "react";

/**
 * The hero name: the first name in light, wide-spaced capitals, the surname
 * in a tinted display-serif italic. Each letter rises out of a soft blur in
 * turn. Pure CSS (server-rendered, no
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
          <span key={w} className={w > 0 ? "ed-name-tail" : "ed-name-head"}>
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
