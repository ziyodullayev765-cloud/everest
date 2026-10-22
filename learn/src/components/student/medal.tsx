import {
  Award, BadgeCheck, BookMarked, BookOpen, Brain, CalendarCheck, Clock, Compass, Crosshair, Crown, Dumbbell, Flame, Gem,
  GraduationCap, Headphones, Library, Lock, Medal as MedalIcon, PenLine, Rocket, Sparkles, Sprout, Star, Target, Trophy, Type, Zap,
  type LucideIcon,
} from "lucide-react";
import { categoryOf } from "@/lib/achievements";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Award, BadgeCheck, BookMarked, BookOpen, Brain, CalendarCheck, Clock, Compass, Crosshair, Crown, Dumbbell, Flame, Gem,
  GraduationCap, Headphones, Library, Medal: MedalIcon, PenLine, Rocket, Sparkles, Sprout, Star, Target, Trophy, Type, Zap,
};

const HEX = "M50 3 L91 26.5 L91 73.5 L50 97 L9 73.5 L9 26.5 Z";
const INNER = "M50 13 L82.5 31.75 L82.5 68.25 L50 87 L17.5 68.25 L17.5 31.75 Z";

/** Hexagon medal: one shape for every badge, colour and icon by category. Locked = grey with a padlock. */
export function Medal({ icon, category, size = 64, locked, className }: { icon: string; category: string; size?: number; locked?: boolean; className?: string }) {
  const c = categoryOf(category);
  const Icon = ICONS[icon] ?? Award;
  const id = `m-${category}-${locked ? "l" : "u"}`;
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full drop-shadow-[0_3px_0_rgba(0,0,0,0.12)]">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={locked ? "#d9ddd9" : c.color} />
            <stop offset="1" stopColor={locked ? "#b9bfba" : c.dark} />
          </linearGradient>
          <linearGradient id={`${id}-r`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={locked ? "#eef0ee" : "#ffffff"} stopOpacity={locked ? 1 : 0.95} />
            <stop offset="1" stopColor={locked ? "#c9cec9" : c.dark} />
          </linearGradient>
        </defs>
        <path d={HEX} fill={`url(#${id}-r)`} />
        <path d={INNER} fill={`url(#${id}-g)`} />
        <path d="M50 13 L82.5 31.75 L82.5 45 Q50 30 17.5 45 L17.5 31.75 Z" fill="#fff" opacity={locked ? 0.25 : 0.18} />
      </svg>
      <Icon className={cn("relative", locked ? "text-white/80" : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]")} style={{ width: size * 0.38, height: size * 0.38 }} strokeWidth={2.4} />
      {locked ? (
        <span className="absolute -right-0.5 -bottom-0.5 grid place-items-center rounded-full bg-surface text-muted ring-2 ring-border" style={{ width: size * 0.32, height: size * 0.32 }}>
          <Lock style={{ width: size * 0.17, height: size * 0.17 }} />
        </span>
      ) : null}
    </span>
  );
}
