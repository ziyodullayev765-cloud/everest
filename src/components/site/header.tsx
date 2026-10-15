"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Download, Menu, X } from "lucide-react";
import { copy } from "@/lib/copy";
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Header({ siteName, logoUrl, nav, resumeUrl }: Props) {
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
      <header
        className={cn(
          "ease-out-expo fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "py-2.5" : "py-4 sm:py-5",
        )}
      >
        <div className="container-x">
          <div
            className={cn(
              "ease-out-expo flex h-14 items-center justify-between gap-4 rounded-full pr-2 pl-2 transition-all duration-500 sm:pl-3",
              scrolled ? "glass bg-bg/75 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)]" : "border border-transparent",
            )}
          >
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3 rounded-full py-1 pr-2"
              aria-label={`${siteName} — ${copy.home}`}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-9 rounded-full object-cover" width={36} height={36} />
              ) : (
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-white/15 to-white/[0.03] text-[0.8rem] font-semibold tracking-tight ring-1 ring-white/10">
                  {initials(siteName)}
                </span>
              )}
              <span className="truncate text-[0.95rem] font-semibold tracking-tight">{siteName}</span>
            </Link>

            <nav aria-label="Asosiy" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {nav.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative rounded-full px-3.5 py-2 text-sm transition-colors",
                          active ? "text-fg" : "text-muted hover:text-fg",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 -z-10 rounded-full bg-white/[0.07] ring-1 ring-white/10"
                            transition={{ type: "spring", bounce: 0.18, duration: 0.6 }}
                          />
                        )}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accent hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-black transition hover:brightness-110 sm:inline-flex"
                >
                  <Download className="size-4" aria-hidden />
                  {copy.downloadCv}
                </a>
              )}
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? copy.closeMenu : copy.menu}
                className="text-fg grid size-11 place-items-center rounded-full ring-1 ring-white/10 transition hover:bg-white/[0.06] lg:hidden"
              >
                {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
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
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-2xl lg:hidden"
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
                          "flex items-center justify-between py-4 text-2xl font-medium tracking-tight sm:text-3xl",
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
                  className="bg-accent mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full text-base font-medium text-black"
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
