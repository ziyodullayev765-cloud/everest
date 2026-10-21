"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeSwitcher } from "./theme";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  assignments: ClipboardList,
  quizzes: Sparkles,
  results: BarChart3,
  profile: User,
  grades: Star,
  achievements: Award,
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
  review: ClipboardCheck,
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
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors",
        active ? "bg-primary-soft text-primary-soft-fg" : "text-text-2 hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-muted group-hover:text-text-2")} aria-hidden />
      <span className="truncate">{item.label}</span>
      {item.badge ? <span className="ml-auto rounded-full bg-primary px-1.5 py-px text-[11px] font-semibold text-primary-fg tabular">{item.badge > 99 ? "99+" : item.badge}</span> : null}
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
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-text">{appName}</div>
          {areaLabel ? <div className="text-[11.5px] font-medium text-muted">{areaLabel}</div> : null}
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Asosiy">
        {sections.map((s, i) => (
          <div key={i}>
            {s.title ? <div className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{s.title}</div> : null}
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
              <div className="truncate text-[13.5px] font-semibold text-text">{user.displayName}</div>
              <div className="truncate text-[12px] text-muted">{user.roleLabel}</div>
            </div>
          </Link>
          <form action={logout}>
            <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" aria-label="Chiqish" title="Chiqish">
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
            <button onClick={() => setDrawer(true)} className="-ml-1.5 grid size-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label="Menyu">
              <Menu className="size-5" />
            </button>
          ) : null}
          <Link href={tabs ? tabs[0].href : sections[0].items[0].href} className="flex min-w-0 items-center gap-2">
            <Brand logoFileId={logoFileId} size={28} />
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{appName}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link href={notificationsHref} className="relative grid size-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label={`Bildirishnomalar${unread ? `, ${unread} ta yangi` : ""}`}>
              <Bell className="size-5" />
              {unread ? <span className="absolute top-2 right-2 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white tabular">{unread > 9 ? "9+" : unread}</span> : null}
            </Link>
            {tabs ? (
              <button onClick={() => setDrawer(true)} className="grid size-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2" aria-label="Ko‘proq">
                <Menu className="size-5" />
              </button>
            ) : (
              <Link href={profileHref} aria-label="Profil" className="ml-1">
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
          aria-label="Menyu"
        >
          <button onClick={() => setDrawer(false)} className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-3 grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Yopish">
            <X className="size-5" />
          </button>
          {sidebar(() => setDrawer(false))}
        </div>
      </div>

      <main id="main" className={cn("mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-6 lg:px-10 lg:pt-9", tabs ? "pb-nav" : "pb-10")}>
        {children}
      </main>

      {/* Bottom tab bar (students, phones) */}
      {tabs ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface/90 pb-safe backdrop-blur-xl lg:hidden" aria-label="Asosiy">
          <ul className="mx-auto grid h-[64px] max-w-lg grid-cols-5">
            {tabs.map((t) => {
              const Icon = ICONS[t.icon] ?? Home;
              const active = isActive(path, t);
              return (
                <li key={t.href}>
                  <Link href={t.href} aria-current={active ? "page" : undefined} className="relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium">
                    <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors duration-200", active ? "bg-primary-soft text-primary" : "text-muted")}>
                      <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.9} aria-hidden />
                    </span>
                    <span className={cn("transition-colors", active ? "text-text" : "text-muted")}>{t.label}</span>
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
