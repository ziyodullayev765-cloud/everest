"use client";

import { useEffect, useState } from "react";
import { useCopy } from "@/components/i18n/provider";

const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const COLORS = ["var(--name-tint)", "var(--fg)", "#34d399", "#60a5fa", "#f472b6", "#c084fc"];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
}

/** ↑ ↑ ↓ ↓ ← → ← → B A — a burst of confetti and a secret message. */
export function KonamiEgg() {
  const copy = useCopy();
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    let at = 0;
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      at = key === CODE[at] ? at + 1 : key === CODE[0] ? 1 : 0;
      if (at === CODE.length) {
        at = 0;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setPieces([]);
        } else {
          setPieces(
            Array.from({ length: 90 }, (_, i) => ({
              id: i,
              left: Math.random() * 100,
              delay: Math.random() * 0.6,
              duration: 2.2 + Math.random() * 1.6,
              rotate: Math.random() * 720 - 360,
              color: COLORS[i % COLORS.length]!,
              size: 6 + Math.random() * 6,
            })),
          );
        }
        setTimeout(() => setPieces(null), 4500);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!pieces) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[96] overflow-hidden" aria-live="polite">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="konami-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.45,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--r": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="absolute inset-x-0 top-1/3 flex justify-center px-4">
        <p className="konami-msg font-display rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-6 py-4 text-center text-xl shadow-2xl sm:text-2xl">
          {copy.konami}
        </p>
      </div>
    </div>
  );
}
