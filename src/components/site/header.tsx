"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Download, Menu, X } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";
import { ThemeToggle } from "@/components/effects/theme";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PaletteButton } from "./palette-triggers";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  siteName: string;
  logoUrl: string | null;
  availability: string;
  nav: NavItem[];
  resumeUrl: string | null;
}

function isActive(pathname: string, href: string) {
  if (href.startsWith("/#") || href.startsWith("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Status pill: a softly pulsing dot plus the availability text. */
function Availability({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "border-line inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.06em] text-[var(--fg-secondary)] uppercase",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      {text}
    </span>
  );
}

export function Header({ siteName, logoUrl, availability, nav, resumeUrl }: Props) {
  const copy = useCopy();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Lock scroll, close on Escape, keep focus inside the open panel.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a,button"));
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (!firstEl || !lastEl) return;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tools = (
    <>
      <PaletteButton />
      <LanguageSwitcher />
      <ThemeToggle />
    </>
  );

  return (
    <>
      <a
        href="#main"
        className="bg-accent fixed top-4 left-4 z-[100] -translate-y-24 rounded-full px-4 py-2 text-sm font-medium text-black transition-transform focus:translate-y-0"
      >
        {copy.skipToContent}
      </a>

      <header className="vt-header fixed inset-x-0 top-0 z-50">
        <div
          className={cn(
            "border-b transition-[background-color,border-color] duration-300",
            scrolled ? "border-line bg-[rgba(var(--bg-rgb),0.86)]" : "border-transparent bg-transparent",
          )}
        >
          {/* Desktop: a centred row of pills, like the reference */}
          <nav aria-label={copy.menu} className="hidden items-center justify-center gap-2.5 px-4 py-4 lg:flex">
            {[{ label: copy.home, href: "/", visible: true }, ...nav].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className="ed-pill"
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <span className="ml-3 flex items-center gap-2">{tools}</span>
          </nav>

          {/* Mobile / tablet: name, tools and the menu button */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
            <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={`${siteName} — ${copy.home}`}>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-7 rounded-full object-cover" width={28} height={28} />
              )}
              <span className="font-display truncate text-[0.98rem] text-[var(--name-tint)] italic">{siteName}</span>
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              {tools}
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? copy.closeMenu : copy.menu}
                className="ed-icon-btn"
              >
                {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={copy.menu}
            initial={reduce ? { opacity: 1 } : { opacity: 0, clipPath: "circle(0% at 100% 0%)" }}
            animate={{ opacity: 1, clipPath: "circle(150% at 100% 0%)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
            className="bg-bg fixed inset-0 z-40 lg:hidden"
          >
            <nav aria-label={copy.menu} className="container-x flex h-full flex-col justify-between pt-28 pb-10">
              <ul className="flex flex-col">
                {[{ label: copy.home, href: "/", visible: true }, ...nav].map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + 0.045 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="border-line border-b"
                  >
                    <Link
                      href={item.href}
                      prefetch
                      onClick={() => setOpen(false)}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className="font-display aria-[current=page]:text-gold flex items-center justify-between py-4 text-3xl"
                    >
                      {item.label}
                      <ArrowUpRight className="text-subtle size-5" aria-hidden />
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-4">
                {availability && <Availability text={availability} className="self-start" />}
                {resumeUrl && (
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="ed-button ed-button--accent">
                    <Download className="size-4" aria-hidden />
                    {copy.downloadCv}
                  </a>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
