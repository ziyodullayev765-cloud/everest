"use client";

import Link from "next/link";
import { HoverPrefetch } from "@/components/effects/hover-prefetch";
import { AdminPageSkeleton } from "./page-skeleton";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Music,
  Award,
  AudioLines,
  BarChart3,
  BookOpen,
  Newspaper,
  Quote,
  Briefcase,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  Images,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Share2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { signOut } from "@/app/admin/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { group: "", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  {
    group: "Content",
    items: [
      { href: "/admin/profile", label: "Profile & About", icon: UserRound },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/achievements", label: "Achievements", icon: Award },
      { href: "/admin/skills", label: "Skills", icon: Sparkles },
      { href: "/admin/experience", label: "Experience", icon: Briefcase },
      { href: "/admin/education", label: "Education", icon: GraduationCap },
      { href: "/admin/posts", label: "Blog", icon: Newspaper },
      { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
      { href: "/admin/stats", label: "Statistics", icon: BarChart3 },
      { href: "/admin/social", label: "Social links", icon: Share2 },
    ],
  },
  {
    group: "Library",
    items: [
      { href: "/admin/media", label: "Media", icon: Images },
      { href: "/admin/audio", label: "Audio", icon: AudioLines },
      { href: "/admin/music", label: "Music", icon: Music },
      { href: "/admin/messages", label: "Messages", icon: Inbox, badge: true },
      { href: "/admin/guestbook", label: "Guestbook", icon: BookOpen },
    ],
  },
  {
    group: "Site",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/account", label: "Account", icon: KeyRound },
    ],
  },
];

export function AdminShell({
  email,
  newMessages,
  monogram = "•",
  children,
}: {
  email: string;
  newMessages: number;
  /** Owner's initials for the logo tile, e.g. "BZ". */
  monogram?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The page a click is heading to: highlighted and shown as a skeleton right
  // away, while the server renders it.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    setOpen(false);
    setPending(null);
  }, [pathname]);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 15_000);
    return () => clearTimeout(t);
  }, [pending]);

  const onClickCapture = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest("a");
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/admin") || url.pathname === pathname) return;
    setPending(url.pathname);
    setOpen(false);
  };

  const current = pending ?? pathname;
  const isActive = (href: string) => (href === "/admin" ? current === "/admin" : current.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="bg-accent grid size-9 place-items-center rounded-xl text-sm font-bold text-black">{monogram}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Portfolio CMS</p>
          <p className="text-subtle truncate text-xs">{email}</p>
        </div>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group || "root"} className="mb-4">
            {g.group && (
              <p className="text-subtle px-3 pt-2 pb-1.5 text-[0.68rem] font-medium tracking-[0.16em] uppercase">{g.group}</p>
            )}
            <ul className="grid gap-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      prefetch={false}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                        active ? "text-fg bg-white/[0.08]" : "text-muted hover:text-fg hover:bg-white/[0.04]",
                      )}
                    >
                      <Icon className={cn("size-4", active && "text-accent")} aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {"badge" in item && item.badge && newMessages > 0 && (
                        <span
                          className="bg-accent rounded-full px-1.5 text-[0.7rem] font-semibold text-black"
                          aria-label={`${newMessages} new`}
                        >
                          {newMessages}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-line grid gap-1 border-t p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="text-muted hover:text-fg flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/[0.04]"
        >
          <ExternalLink className="size-4" aria-hidden /> View website
        </a>
        <form action={signOut}>
          <button
            type="submit"
            className="text-muted hover:text-fg flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/[0.04]"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="bg-bg min-h-dvh" onClickCapture={onClickCapture}>
      <HoverPrefetch />
      {pending && <div className="admin-progress" aria-hidden />}
      <aside className="border-line bg-bg-elevated fixed inset-y-0 left-0 z-40 hidden w-64 border-r lg:block">{sidebar}</aside>

      <header className="border-line bg-bg/85 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-xl lg:hidden">
        <span className="text-sm font-semibold">Portfolio CMS</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-xl hover:bg-white/[0.06]"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="border-line bg-bg-elevated absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg hover:bg-white/10"
            >
              <X className="size-4" aria-hidden />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main id="main" className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">{pending ? <AdminPageSkeleton /> : children}</div>
      </main>
    </div>
  );
}
