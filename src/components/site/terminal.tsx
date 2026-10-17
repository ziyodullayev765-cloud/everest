"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useCopy, useLocale } from "@/components/i18n/provider";
import { isLocale, LOCALES } from "@/lib/i18n/dictionaries";
import { storeLocale, toggleTheme } from "@/lib/client/prefs";

export interface TerminalData {
  name: string;
  headline: string;
  email: string | null;
  cvHref: string;
  pages: { href: string; label: string }[];
  projects: { title: string; slug: string }[];
  posts: { title: string; slug: string }[];
  social: { label: string; url: string }[];
  skills: string[];
}

interface Line {
  id: number;
  node: ReactNode;
}

const COMMANDS: [string, string][] = [
  ["help", "list commands"],
  ["whoami", "who built this site"],
  ["ls", "list pages"],
  ["cd <page>", "open a page, e.g. cd projects"],
  ["projects", "list projects"],
  ["open <n>", "open project number n"],
  ["blog", "list articles"],
  ["skills", "list skills"],
  ["social", "links elsewhere"],
  ["contact", "how to reach me"],
  ["cv", "download the CV"],
  ["lang <en|uz|ru>", "switch language"],
  ["theme", "toggle light / dark"],
  ["date", "current date and time"],
  ["echo <text>", "print text"],
  ["clear", "clear the screen"],
  ["exit", "close the terminal"],
];

const slugOf = (href: string) => href.replace(/^\/+/, "").toLowerCase();

/** A small fake shell over the site's content. Pure client side, nothing is executed. */
export function Terminal({ open, onClose, data }: { open: boolean; onClose: () => void; data: TerminalData }) {
  const copy = useCopy();
  const locale = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [, start] = useTransition();
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const user = (data.name.split(/\s+/)[0] || "guest").toLowerCase().replace(/[^a-z0-9]/g, "") || "guest";
  const prompt = `${user}@portfolio:~$`;

  const print = (...nodes: ReactNode[]) =>
    setLines((ls) => [...ls, ...nodes.map((node) => ({ id: ++seq.current, node }))].slice(-300));

  useEffect(() => {
    if (!open) return;
    if (!lines.length) print(<span className="text-[#f2f2f280]">{copy.terminal.welcome}</span>);
    const id = requestAnimationFrame(() => input.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    screen.current?.scrollTo({ top: screen.current.scrollHeight });
  }, [lines]);

  const navigate = (href: string) => {
    print(<span className="text-[#f2f2f280]">→ {href}</span>);
    router.push(href);
    setTimeout(onClose, 250);
  };

  const run = (raw: string) => {
    const cmdline = raw.trim();
    print(
      <span>
        <span className="term-prompt">{prompt}</span> {cmdline}
      </span>,
    );
    if (!cmdline) return;
    setHistory((h) => [cmdline, ...h.filter((x) => x !== cmdline)].slice(0, 50));
    const [cmd = "", ...args] = cmdline.split(/\s+/);
    const arg = args.join(" ");
    switch (cmd.toLowerCase()) {
      case "help":
        print(
          <span className="text-[#f2f2f280]">{copy.terminal.help}:</span>,
          ...COMMANDS.map(([c, d]) => (
            <span key={c}>
              <span className="inline-block w-44 text-[#f2f2f2]">{c}</span>
              <span className="text-[#f2f2f280]">{d}</span>
            </span>
          )),
        );
        break;
      case "whoami":
        print(
          <span className="text-[#f2f2f2]">{data.name}</span>,
          ...(data.headline
            ? [
                <span key="h" className="text-[#f2f2f280]">
                  {data.headline}
                </span>,
              ]
            : []),
        );
        break;
      case "ls":
        print(<span>{data.pages.map((p) => slugOf(p.href) || "home").join("  ")}</span>);
        break;
      case "cd": {
        const want = arg.toLowerCase().replace(/^\/+/, "");
        if (!want || want === "~" || want === "home") return navigate("/");
        const page = data.pages.find((p) => slugOf(p.href) === want || p.label.toLowerCase() === want);
        if (page) return navigate(page.href);
        print(<span className="text-red-400">cd: {arg}: no such page</span>);
        break;
      }
      case "projects":
        if (!data.projects.length) print(<span className="text-[#f2f2f280]">(empty)</span>);
        else
          print(
            ...data.projects.map((p, i) => (
              <span key={p.slug}>
                <span className="text-[#f2f2f280]">[{i + 1}]</span> {p.title}
              </span>
            )),
            <span className="text-[#f2f2f280]">open &lt;n&gt;</span>,
          );
        break;
      case "open": {
        const n = Number(arg);
        const p = Number.isInteger(n) ? data.projects[n - 1] : data.projects.find((x) => x.slug === arg);
        if (p) return navigate(`/projects/${p.slug}`);
        print(<span className="text-red-400">open: {arg || "?"}: not found</span>);
        break;
      }
      case "blog":
        if (!data.posts.length) print(<span className="text-[#f2f2f280]">(empty)</span>);
        else print(...data.posts.map((p) => <span key={p.slug}>• {p.title}</span>));
        break;
      case "skills":
        print(<span>{data.skills.length ? data.skills.join(" · ") : "(empty)"}</span>);
        break;
      case "social":
        if (!data.social.length) print(<span className="text-[#f2f2f280]">(empty)</span>);
        else
          print(
            ...data.social.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
              >
                {s.label} → {s.url}
              </a>
            )),
          );
        break;
      case "contact":
      case "email":
        if (data.email)
          print(
            <a href={`mailto:${data.email}`} className="underline-offset-4 hover:underline">
              {data.email}
            </a>,
          );
        else navigate("/contact");
        break;
      case "cv":
      case "resume":
        print(<span className="text-[#f2f2f280]">→ {data.cvHref}</span>);
        window.open(data.cvHref, "_blank", "noopener");
        break;
      case "lang": {
        const l = arg.toLowerCase();
        if (!isLocale(l)) {
          print(
            <span className="text-[#f2f2f280]">
              lang {LOCALES.join(" | ")} (now: {locale})
            </span>,
          );
          break;
        }
        storeLocale(l);
        start(() => router.refresh());
        print(<span>✓ {l}</span>);
        break;
      }
      case "theme":
        print(<span>✓ {toggleTheme() ? "light" : "dark"}</span>);
        break;
      case "date":
        print(<span>{new Date().toString()}</span>);
        break;
      case "echo":
        print(<span>{arg}</span>);
        break;
      case "clear":
        setLines([]);
        break;
      case "exit":
      case "quit":
        onClose();
        break;
      case "sudo":
        print(<span className="text-red-400">Permission denied. Nice try 🙂</span>);
        break;
      case "rm":
        print(<span className="text-red-400">rm: this website is read-only 🙂</span>);
        break;
      default:
        print(
          <span className="text-red-400">
            {copy.terminal.unknown}: {cmd}. <span className="text-[#f2f2f280]">help</span>
          </span>,
        );
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(value);
      setValue("");
      setHIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const n = Math.min(hIdx + 1, history.length - 1);
      if (n >= 0) {
        setHIdx(n);
        setValue(history[n]!);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const n = hIdx - 1;
      setHIdx(Math.max(n, -1));
      setValue(n >= 0 ? history[n]! : "");
    } else if (e.key === "Tab") {
      e.preventDefault();
      const names = COMMANDS.map(([c]) => c.split(" ")[0]!);
      const hit = names.filter((c) => c.startsWith(value.trim().toLowerCase()));
      if (hit.length === 1) setValue(`${hit[0]} `);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={copy.terminal.title}
          data-lenis-prevent
          className="term border-line fixed inset-x-3 bottom-3 z-[95] mx-auto flex h-[min(60vh,440px)] max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[#0b0b0c]/95 text-[#e6e6e6] shadow-2xl backdrop-blur"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => input.current?.focus()}
        >
          <div className="flex items-center gap-2 border-b border-[#ffffff1a] px-4 py-2.5">
            <span className="size-3 rounded-full bg-[#ff5f57]" aria-hidden />
            <span className="size-3 rounded-full bg-[#febc2e]" aria-hidden />
            <span className="size-3 rounded-full bg-[#28c840]" aria-hidden />
            <span className="ml-3 flex-1 truncate text-xs text-[#f2f2f280]">{prompt}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.terminal.close}
              className="rounded p-1 text-[#f2f2f299] hover:text-[#fff]"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div ref={screen} className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
            {lines.map((l) => (
              <div key={l.id} className="break-words whitespace-pre-wrap">
                {l.node}
              </div>
            ))}
            <label className="flex items-center gap-2">
              <span className="term-prompt shrink-0">{prompt}</span>
              <input
                ref={input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label={copy.terminal.title}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full bg-transparent text-[#e6e6e6] caret-[var(--name-tint)] outline-none"
              />
            </label>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
