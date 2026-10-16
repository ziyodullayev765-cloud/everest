"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, FileDown, FileText, FolderKanban, Globe, Mail, Search, SunMoon, SquareTerminal } from "lucide-react";
import { useCopy, useLocale } from "@/components/i18n/provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/dictionaries";
import { storeLocale, toggleTheme } from "@/lib/client/prefs";
import { trackEvent } from "@/lib/client/track";
import { Terminal, type TerminalData } from "./terminal";

export const PALETTE_EVENT = "portfolio:palette";
export const TERMINAL_EVENT = "portfolio:terminal";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

/** Normalises text for matching: lower case, no accents or Uzbek apostrophes. */
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ‘’ʻʼ'`]/g, "");
}

/** Every query word must appear in the label (in any order). */
function matches(label: string, q: string) {
  const l = norm(label);
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => l.includes(w));
}

/**
 * Ctrl/⌘ + K menu: jump to any page, project or article, switch language or
 * theme, copy the email, download the CV, or open the terminal easter egg.
 */
export function CommandPalette({ data }: { data: TerminalData }) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [toast, setToast] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) lastFocus.current = document.activeElement as HTMLElement;
          return !v;
        });
        return;
      }
      // "~" opens the terminal, unless the visitor is typing somewhere.
      const t = e.target as HTMLElement | null;
      const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (!typing && e.key === "~") {
        e.preventDefault();
        setOpen(false);
        setTerm(true);
      }
    };
    const onOpen = () => {
      lastFocus.current = document.activeElement as HTMLElement;
      setOpen(true);
    };
    const onTerm = () => {
      setOpen(false);
      setTerm(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, onOpen);
    window.addEventListener(TERMINAL_EVENT, onTerm);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, onOpen);
      window.removeEventListener(TERMINAL_EVENT, onTerm);
    };
  }, []);

  useEffect(() => {
    if (term) trackEvent("Terminal opened");
  }, [term]);

  useEffect(() => {
    if (!open) return;
    trackEvent("Command palette opened");
    setQ("");
    setActive(0);
    const id = requestAnimationFrame(() => input.current?.focus());
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const items = useMemo<Item[]>(() => {
    const p = copy.palette;
    const out: Item[] = [
      ...data.pages.map((pg) => ({
        id: `page:${pg.href}`,
        group: p.pages,
        label: pg.label,
        hint: pg.href,
        icon: ArrowRight,
        run: () => go(pg.href),
      })),
      ...data.projects.map((pr) => ({
        id: `project:${pr.slug}`,
        group: p.projects,
        label: pr.title,
        icon: FolderKanban,
        run: () => go(`/projects/${pr.slug}`),
      })),
      ...data.posts.map((po) => ({
        id: `post:${po.slug}`,
        group: p.posts,
        label: po.title,
        icon: FileText,
        run: () => go(`/blog/${po.slug}`),
      })),
      ...LOCALES.filter((l) => l !== locale).map((l) => ({
        id: `lang:${l}`,
        group: p.language,
        label: LOCALE_LABELS[l],
        icon: Globe,
        run: () => {
          setOpen(false);
          storeLocale(l);
          start(() => router.refresh());
        },
      })),
      {
        id: "theme",
        group: p.actions,
        label: p.theme,
        icon: SunMoon,
        run: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      { id: "cv", group: p.actions, label: p.cv, icon: FileDown, run: () => go(data.cvHref) },
      {
        id: "terminal",
        group: p.actions,
        label: p.terminal,
        hint: "~",
        icon: SquareTerminal,
        run: () => {
          setOpen(false);
          setTerm(true);
        },
      },
    ];
    if (data.email) {
      const email = data.email;
      out.push({
        id: "email",
        group: p.actions,
        label: p.copyEmail,
        hint: email,
        icon: Mail,
        run: () => {
          void navigator.clipboard?.writeText(email).then(
            () => {
              setToast(p.copied);
              setTimeout(() => setToast(""), 1600);
            },
            () => {},
          );
        },
      });
    }
    return out;
  }, [copy, data, locale, go, router]);

  const shown = useMemo(() => (q.trim() ? items.filter((i) => matches(`${i.label} ${i.hint ?? ""}`, q)) : items), [items, q]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (shown.length ? (a + 1) % shown.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (shown.length ? (a - 1 + shown.length) % shown.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      shown[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  let lastGroup = "";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              aria-label={copy.closeMenu}
              tabIndex={-1}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={copy.palette.open}
              data-lenis-prevent
              className="border-line relative w-full max-w-xl overflow-hidden rounded-2xl border bg-[var(--bg)] shadow-2xl"
              initial={reduce ? false : { y: -12, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={reduce ? undefined : { y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onKeyDown={onKeyDown}
            >
              <div className="border-line flex items-center gap-3 border-b px-4">
                <Search className="text-muted size-4 shrink-0" aria-hidden />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={copy.palette.placeholder}
                  aria-label={copy.palette.placeholder}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="palette-list"
                  aria-activedescendant={shown[active] ? `palette-${shown[active].id}` : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-14 w-full bg-transparent text-[0.95rem] outline-none placeholder:text-[var(--fg-secondary)]/60"
                />
                <span className="kbd">Esc</span>
              </div>
              <ul ref={list} id="palette-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
                {shown.length === 0 && <li className="text-muted px-3 py-8 text-center text-sm">{copy.palette.empty}</li>}
                {shown.map((item, i) => {
                  const header = item.group !== lastGroup ? item.group : null;
                  lastGroup = item.group;
                  return (
                    <li key={item.id} role="presentation">
                      {header && (
                        <p
                          role="presentation"
                          className="text-subtle px-3 pt-3 pb-1.5 text-[0.65rem] tracking-[0.18em] uppercase"
                        >
                          {header}
                        </p>
                      )}
                      <div
                        id={`palette-${item.id}`}
                        role="option"
                        aria-selected={i === active}
                        data-active={i === active}
                        data-index={i}
                        className="palette-item flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--fg-secondary)]"
                        onMouseMove={() => setActive(i)}
                        onClick={() => item.run()}
                      >
                        <item.icon className="size-4 shrink-0 opacity-70" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.hint && <span className="text-subtle truncate text-xs">{item.hint}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="border-line text-subtle flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[0.7rem]">
                <span className="flex items-center gap-1.5">
                  <span className="kbd">↑</span>
                  <span className="kbd">↓</span>
                  <span className="kbd">↵</span> {copy.palette.hint}
                </span>
                <span aria-live="polite">{toast}</span>
                <span className="flex items-center gap-1.5">
                  <span className="kbd">~</span> {copy.terminal.title}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Terminal open={term} onClose={() => setTerm(false)} data={data} />
    </>
  );
}
