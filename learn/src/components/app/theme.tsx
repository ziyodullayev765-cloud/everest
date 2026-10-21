"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Applied before first paint (inlined in <head>) so there is no theme flash. */
export const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

type Mode = "light" | "dark" | "system";

function apply(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute("content", dark ? "#0b100d" : "#f5f6f3");
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try {
      setMode((localStorage.getItem("theme") as Mode) || "system");
    } catch {}
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      try {
        if ((localStorage.getItem("theme") || "system") === "system") apply("system");
      } catch {}
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const choose = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem("theme", m);
    } catch {}
    apply(m);
  };
  const opts: { m: Mode; icon: typeof Sun; label: string }[] = [
    { m: "light", icon: Sun, label: "Yorug‘" },
    { m: "dark", icon: Moon, label: "Qorong‘i" },
    { m: "system", icon: Monitor, label: "Tizim" },
  ];
  return (
    <div className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", className)} role="radiogroup" aria-label="Mavzu">
      {opts.map(({ m, icon: Icon, label }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => choose(m)}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition", mode === m && "bg-surface text-text shadow-soft")}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
