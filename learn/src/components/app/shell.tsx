"use client";
import Link from "next/link";
import { PullToRefresh } from "./pull-to-refresh";
import { clearSavedFiles } from "@/lib/offline";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  Trophy,
  BookA,
  BookOpenText,
  Bot,
  Headphones,
  PenLine,
  BarChart3,
  Bell,
  BookOpen,
  BookOpenCheck,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Home,
  Inbox,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Star,
  User,
  Users,
  UsersRound,
  X,
  type LucideIcon,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeSwitcher } from "./theme";
import { tr } from "@/lib/i18n/tr";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  assignments: ClipboardList,
  quizzes: Sparkles,
  results: BarChart3,
  profile: User,
  grades: Star,
  achievements: Award,
  leaderboard: Trophy,
  classes: UsersRound,
  notifications: Bell,
  install: Download,
  dashboard: LayoutDashboard,
  inbox: Inbox,
  gradebook: FileSpreadsheet,
  builder: BookOpenCheck,
  students: GraduationCap,
  teachers: Users,
  layers: Layers,
  subjects: BookOpen,
  bank: Library,
  settings: Settings,
  audit: ScrollText,
  database: Database,
  review: ClipboardCheck,
  vocabulary: BookA,
  words: BookOpen,
  grammar: PenLine,
  reading: BookOpenText,
  listening: Headphones,
  tutor: Bot,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS | string; exact?: boolean; badge?: number };
export type NavSection = { title?: string; items: NavItem[] };

function isActive(path: string, item: NavItem) {
  if (item.exact) return path === item.href;
  return path === item.href || path.startsWith(item.href + "/");
}

function NavLink({ item, path, onNavigate }: { item: NavItem; path: string; onNavigate?: () => void }) {
  const Icon = ICONS[item.icon] ?? Home;
  const active = isActive(path, item);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition-colors",
        active ? "bg-primary-soft text-primary-soft-fg ring-2 ring-primary/30" : "text-text-2 hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted group-hover:text-text-2")} aria-hidden />
      <span className="truncate">{item.label}</span>
      {item.badge ? <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[11px] font-bold text-primary-fg tabular">{item.badge > 99 ? "99+" : item.badge}</span> : null}
    </Link>
  );
}

type ShellProps = {
  appName: string;
  logoFileId?: string | null;
  areaLabel?: string;
  sections: NavSection[];
  tabs?: NavItem[];
  user: { displayName: string; avatarFileId: string | null; roleLabel: string };
  unread: number;
  logout: () => Promise<void>;
  profileHref: string;
  notificationsHref: string;
  children: React.ReactNode;
};

export function AppShell({ appName, logoFileId, areaLabel, sections, tabs, user, unread, logout, profileHref, notificationsHref, children }: ShellProps) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [path]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
  }, [drawer]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Brand logoFileId={logoFileId} size={30} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[15px] font-bold tracking-[-0.01em] text-text">{appName}</div>
          {areaLabel ? <div className="text-[11.5px] font-semibold text-muted">{areaLabel}</div> : null}
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label={tr("Asosiy")}>
        {sections.map((s, i) => (
          <div key={i}>
            {s.title ? <div className="mb-1.5 px-3 text-[11px] font-bold tracking-[0.06em] text-muted uppercase">{s.title}</div> : null}
            <div className="space-y-0.5">
              {s.items.map((it) => (
                <NavLink key={it.href} item={it.href === notificationsHref ? { ...it, badge: unread } : it} path={path} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-3 border-t border-border p-3">
        <ThemeSwitcher className="w-full justify-between [&>button]:flex-1 [&>button]:justify-center" />
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <Link href={profileHref} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={user.displayName} fileId={user.avatarFileId} size={34} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13.5px] font-bold text-text">{user.displayName}</div>
              <div className="truncate text-[12px] text-muted">{user.roleLabel}</div>
            </div>
          </Link>
          <form action={logout} onSubmit={clearSavedFiles}>
            <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" aria-label={tr("Chiqish")} title={tr("Chiqish")}>
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-surface lg:block">{sidebar()}</aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 pt-safe backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          {!tabs ? (
            <button onClick={() => setDrawer(true)} className="-ml-1.5 grid size-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label={tr("Menyu")}>
              <Menu className="size-5" />
            </button>
          ) : null}
          <Link href={tabs ? tabs[0].href : sections[0].items[0].href} className="flex min-w-0 items-center gap-2">
            <Brand logoFileId={logoFileId} size={28} />
            <span className="truncate text-[15px] font-bold tracking-[-0.01em]">{appName}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link href={notificationsHref} className="relative grid size-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label={`Bildirishnomalar${unread ? tr(", {0} ta yangi", unread) : ""}`}>
              <Bell className="size-5" />
              {unread ? <span className="absolute top-2 right-2 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white tabular">{unread > 9 ? "9+" : unread}</span> : null}
            </Link>
            {tabs ? (
              <button onClick={() => setDrawer(true)} className="grid size-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label={tr("Ko‘proq")}>
                <Menu className="size-5" />
              </button>
            ) : (
              <Link href={profileHref} aria-label={tr("Profil")} className="ml-1">
                <Avatar name={user.displayName} fileId={user.avatarFileId} size={30} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Drawer (mobile) */}
      <div className={cn("fixed inset-0 z-[60] overflow-hidden lg:hidden", drawer ? "pointer-events-auto visible" : "pointer-events-none invisible delay-300")} aria-hidden={!drawer}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", drawer ? "opacity-100" : "opacity-0")} onClick={() => setDrawer(false)} />
        <div
          className={cn("absolute inset-y-0 w-[86%] max-w-[320px] bg-surface pt-safe pb-safe shadow-pop transition-transform duration-300", tabs ? "right-0" : "left-0", drawer ? "translate-x-0" : tabs ? "translate-x-full" : "-translate-x-full")}
          role="dialog"
          aria-modal="true"
          aria-label={tr("Menyu")}
        >
          <button onClick={() => setDrawer(false)} className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-3 grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={tr("Yopish")}>
            <X className="size-5" />
          </button>
          {sidebar(() => setDrawer(false))}
        </div>
      </div>

      <PullToRefresh />
      <main id="main" className={cn("mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-6 lg:px-10 lg:pt-9", tabs ? "pb-nav" : "pb-10")}>
        {children}
      </main>

      {/* Bottom tab bar (students, phones) */}
      {tabs ? (
        <nav className="fixed inset-x-2 bottom-[max(4px,calc(env(safe-area-inset-bottom)*0.35))] z-40 lg:hidden" aria-label={tr("Asosiy")}>
          <ul className="mx-auto grid h-[68px] max-w-md grid-cols-5 rounded-[28px] border border-border/60 bg-surface shadow-[0_8px_30px_rgba(16,40,28,0.12)]">
            {tabs.map((t, i) => {
              const Icon = ICONS[t.icon] ?? Home;
              const active = isActive(path, t);
              // The middle tab (vocabulary) is the raised, round "main action" button.
              if (i === 2 && tabs.length === 5)
                return (
                  <li key={t.href} className="relative">
                    <Link href={t.href} aria-current={active ? "page" : undefined} className="flex h-full flex-col items-center justify-end pb-2 text-[11.5px] font-bold">
                      <span
                        className={cn(
                          "absolute -top-7 left-1/2 grid size-[60px] -translate-x-1/2 place-items-center rounded-full bg-gradient-to-b from-[#2fbf6c] to-primary text-white ring-[7px] ring-primary-soft shadow-[0_6px_16px_rgba(30,165,90,0.35)] transition-transform active:scale-95",
                          active && "ring-primary/25",
                        )}
                      >
                        <Icon className="size-[26px]" strokeWidth={2.4} fill="currentColor" fillOpacity={0.25} aria-hidden />
                      </span>
                      <span className={cn(active ? "font-extrabold text-primary" : "text-muted")}>{t.label}</span>
                    </Link>
                  </li>
                );
              return (
                <li key={t.href}>
                  <Link href={t.href} aria-current={active ? "page" : undefined} className="relative flex h-full flex-col items-center justify-center gap-0.5 text-[11.5px] font-bold">
                    <Icon
                      className={cn("size-[24px] transition-colors duration-200", active ? "text-primary" : "text-muted")}
                      strokeWidth={active ? 2.5 : 2}
                      fill={active ? "currentColor" : "none"}
                      fillOpacity={active ? 0.2 : 0}
                      aria-hidden
                    />
                    <span className={cn("transition-colors", active ? "font-extrabold text-primary" : "text-muted")}>{t.label}</span>
                    <span aria-hidden className={cn("h-1 rounded-full bg-primary transition-all duration-200", active ? "w-5 opacity-100" : "w-0 opacity-0")} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

function Brand({ logoFileId, size }: { logoFileId?: string | null; size: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (logoFileId) return <img src={`/api/files/${logoFileId}`} alt="" width={size} height={size} className="shrink-0 rounded-[9px] object-cover" />;
  return <LogoMark size={size} />;
}
