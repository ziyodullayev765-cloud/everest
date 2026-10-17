"use client";

import { useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * A project running inside a browser window or phone frame. Nothing from the
 * other site loads until the visitor presses play (privacy and page speed).
 */
export function ProjectDemo({
  src,
  kind,
  title,
  poster,
}: {
  src: string;
  kind: "browser" | "phone";
  title: string;
  poster?: string | null;
}) {
  const copy = useCopy();
  const [on, setOn] = useState(false);
  const host = new URL(src).hostname.replace(/^www\./, "");
  const phone = kind === "phone";

  const screen = on ? (
    <iframe
      src={src}
      title={title}
      className="absolute inset-0 size-full border-0 bg-white"
      allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
      loading="lazy"
    />
  ) : (
    <button
      type="button"
      onClick={() => setOn(true)}
      data-track="Demo launched"
      className="group absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden bg-[var(--surface)] text-center"
      style={
        poster
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,.62),rgba(0,0,0,.72)), url(${JSON.stringify(poster).slice(1, -1)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <span className="grid size-16 place-items-center rounded-full bg-[var(--fg)] text-[var(--bg)] shadow-xl transition-transform duration-300 group-hover:scale-110">
        <Play className="ml-0.5 size-6" aria-hidden />
      </span>
      <span
        className={cn(
          "px-6 text-sm font-medium",
          poster ? "text-[#fff] [text-shadow:0_1px_8px_rgba(0,0,0,.6)]" : "text-[var(--fg)]",
        )}
      >
        {copy.demo.launch}
      </span>
      <span className={cn("px-6 text-xs", poster ? "text-[#ffffffb3]" : "text-muted")}>
        {copy.demo.note.replace("{host}", host)}
      </span>
    </button>
  );

  return (
    <div>
      {phone ? (
        <div className="mx-auto w-[min(360px,100%)] rounded-[3rem] border border-[var(--border)] bg-[#0b0b0c] p-3 shadow-2xl">
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.4rem]">
            {screen}
            <span
              className="pointer-events-none absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black"
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <span className="size-3 rounded-full bg-[#ff5f57]" aria-hidden />
            <span className="size-3 rounded-full bg-[#febc2e]" aria-hidden />
            <span className="size-3 rounded-full bg-[#28c840]" aria-hidden />
            <span className="text-muted ml-3 min-w-0 flex-1 truncate rounded-md bg-[color-mix(in_oklab,var(--fg)_6%,transparent)] px-3 py-1 text-center text-xs">
              {host}
            </span>
          </div>
          <div className="relative aspect-[16/10]">{screen}</div>
        </div>
      )}
      <p className="mt-4 text-center">
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-fg inline-flex items-center gap-1.5 text-sm transition"
        >
          {copy.demo.open} <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </p>
    </div>
  );
}
