"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";

import { THEME_KEY as KEY } from "@/lib/theme-script";

export function ThemeToggle() {
  const copy = useCopy();
  const [light, setLight] = useState(false);

  useEffect(() => setLight(document.documentElement.classList.contains("light")), []);

  // The new theme spreads out from the button as a growing circle (View
  // Transitions API); browsers without it, or reduced motion, switch at once.
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !light;
    const apply = () => {
      flushSync(() => setLight(next));
      document.documentElement.classList.toggle("light", next);
      try {
        localStorage.setItem(KEY, next ? "light" : "dark");
      } catch {}
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc
      .startViewTransition(apply)
      .ready.then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? copy.darkMode : copy.lightMode}
      title={light ? copy.darkMode : copy.lightMode}
      className="ed-icon-btn !border-2 !border-[var(--fg)]"
    >
      {light ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}
