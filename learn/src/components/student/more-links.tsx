import Link from "next/link";
import { BarChart3, Bell, BookOpenText, Bot, Download, Headphones, Library, PenLine, Star, UsersRound } from "lucide-react";
import { tutorEnabled } from "@/server/services/tutor";

/** Secondary sections, reachable from Profile on phones (the bottom bar holds five tabs). */
export function MoreLinks() {
  const items = [
    { href: "/results", label: "Natijalarim", icon: BarChart3 },
    { href: "/grammar", label: "Grammatika", icon: PenLine },
    { href: "/reading", label: "Reading", icon: BookOpenText },
    { href: "/listening", label: "Listening", icon: Headphones },
    ...(tutorEnabled() ? [{ href: "/tutor", label: "AI yordamchi", icon: Bot }] : []),
    { href: "/grades", label: "Baholar", icon: Star },
    { href: "/library", label: "Kutubxona", icon: Library },
    { href: "/classes", label: "Guruhlarim", icon: UsersRound },
    { href: "/notifications", label: "Bildirishnomalar", icon: Bell },
    { href: "/install", label: "Ilovani o‘rnatish", icon: Download },
  ];
  return (
    <nav aria-label="Bo‘limlar" className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:hidden">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-2 py-3 text-center text-[12px] font-medium text-text-2 shadow-soft active:scale-[0.98]">
          <Icon className="size-5 text-primary" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
