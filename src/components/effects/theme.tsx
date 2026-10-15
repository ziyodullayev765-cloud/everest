"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_KEY as KEY } from "@/lib/theme-script";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => setLight(document.documentElement.classList.contains("light")), []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(KEY, next ? "light" : "dark");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Dark mode" : "Light mode"}
      title={light ? "Dark mode" : "Light mode"}
      className="ed-icon-btn"
    >
      {light ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}
