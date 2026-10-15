"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Download, Menu, X } from "lucide-react";
import { copy } from "@/lib/copy";
import { SoundToggle } from "@/components/effects/sound";
import { ThemeToggle } from "@/components/effects/theme";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  siteName: string;
  logoUrl: string | null;
  nav: NavItem[];
  resumeUrl: string | null;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ siteName, nav, resumeUrl }: Props) {
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

  return (
    <>
      <a
        href="#main"
        className="bg-accent fixed top-4 left-4 z-[100] -translate-y-24 rounded-full px-4 py-2 text-sm font-medium text-black transition-transform focus:translate-y-0"
      >
        {copy.skipToContent}
      </a>
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          className={cn(
            "border-b transition-colors duration-300",
            scrolled ? "border-line bg-[rgba(var(--surface-rgb),0.92)]" : "border-transparent bg-transparent",
          )}
        >
          {/* Desktop: centred row of pills, like an editorial index */}
          <nav aria-label="Asosiy" className="ed-nav hidden flex-wrap items-center justify-center gap-2.5 px-4 py-4 lg:flex">
            {[{ label: copy.home, href: "/", visible: true }, ...nav].map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
            {resumeUrl && (
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                <Download className="size-3.5" aria-hidden />
                {copy.downloadCv}
              </a>
            )}
            <span className="ml-2 flex items-center gap-2">
              <ThemeToggle />
              <SoundToggle />
            </span>
          </nav>

          {/* Mobile: name + toggles */}
          <div className="ed-nav flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
            <Link href="/" className="font-display min-w-0 truncate !border-0 !bg-transparent !px-0 text-sm tracking-[0.08em]">
              {siteName}
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <SoundToggle />
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? copy.closeMenu : copy.menu}
                className="grid size-10 place-items-center !p-0"
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
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-bg/95 fixed inset-0 z-40 lg:hidden"
          >
            <nav aria-label="Mobil" className="container-x flex h-full flex-col justify-between pt-28 pb-10">
              <ul className="flex flex-col">
                {[{ label: copy.home, href: "/", visible: true }, ...nav].map((item, i) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <motion.li
                      key={item.href}
                      initial={reduce ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="border-line border-b"
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "font-display flex items-center justify-between py-4 text-2xl sm:text-3xl",
                          active ? "text-accent" : "text-fg",
                        )}
                      >
                        {item.label}
                        <ArrowUpRight className="text-subtle size-5" aria-hidden />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ed-button ed-button--accent mt-8 justify-center"
                >
                  <Download className="size-4" aria-hidden />
                  {copy.downloadCv}
                </a>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
