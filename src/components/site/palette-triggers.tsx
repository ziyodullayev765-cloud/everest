"use client";

import { Search, SquareTerminal } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";
import { PALETTE_EVENT, TERMINAL_EVENT } from "./command-palette";

export function PaletteButton() {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
      aria-label={copy.palette.open}
      title={`${copy.palette.open} (Ctrl K)`}
      aria-keyshortcuts="Control+K Meta+K"
      className="ed-icon-btn"
    >
      <Search className="size-4" aria-hidden />
    </button>
  );
}

export function TerminalButton() {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TERMINAL_EVENT))}
      className="text-muted hover:text-fg inline-flex items-center gap-2 font-mono text-[0.78rem] transition"
      title={`${copy.palette.terminal} (~)`}
    >
      <SquareTerminal className="size-3.5" aria-hidden /> {copy.palette.terminal}
    </button>
  );
}
