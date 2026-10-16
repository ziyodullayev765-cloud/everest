"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";

import { THEME_EVENT, toggleTheme } from "@/lib/client/prefs";

export function ThemeToggle() {
  const copy = useCopy();
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    const sync = (e: Event) => setLight(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const toggle = () => setLight(toggleTheme());

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
