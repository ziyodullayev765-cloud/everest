"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, LOCALE_SHORT, type Locale } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { useCopy, useLocale } from "./provider";

/** EN / UZ / RU menu. Stores the choice in a cookie and re-renders the page. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const copy = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const choose = (l: Locale) => {
    setOpen(false);
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    start(() => router.refresh());
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${copy.language}: ${LOCALE_LABELS[locale]}`}
        className={cn(
          "ed-icon-btn !inline-flex w-auto items-center gap-1.5 px-3 text-[0.72rem] font-semibold tracking-[0.08em]",
          pending && "opacity-60",
        )}
      >
        <Globe className="size-3.5" aria-hidden />
        {LOCALE_SHORT[locale]}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={copy.language}
          className="border-line bg-surface absolute top-full right-0 z-[60] mt-2 min-w-40 overflow-hidden rounded-2xl border p-1 shadow-[var(--shadow-hover)]"
        >
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                lang={l}
                onClick={() => choose(l)}
                className="hover:bg-surface-strong flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm"
              >
                <span>
                  <span className="text-muted mr-2 font-mono text-xs">{LOCALE_SHORT[l]}</span>
                  {LOCALE_LABELS[l]}
                </span>
                {l === locale && <Check className="text-accent size-4" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
