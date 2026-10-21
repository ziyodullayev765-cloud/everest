import { Clock, Flame, Footprints, Gem, GraduationCap, Sparkles, Target, Zap, Award, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MAP: Record<string, LucideIcon> = { Clock, Flame, Footprints, Gem, GraduationCap, Sparkles, Target, Zap };
const TIER = {
  bronze: "bg-[#f6ead9] text-[#9a5b1d] dark:bg-[#2c2012] dark:text-[#e0a55e]",
  silver: "bg-[#e9edf1] text-[#4f6072] dark:bg-[#1d242c] dark:text-[#a9bbcd]",
  gold: "bg-[#fbf0cf] text-[#9a7409] dark:bg-[#2d2610] dark:text-[#ecc24d]",
};

export function AchievementIcon({ name, tier, size = 40, locked }: { name: string; tier: keyof typeof TIER; size?: number; locked?: boolean }) {
  const Icon = MAP[name] ?? Award;
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", locked ? "bg-surface-3 text-muted" : TIER[tier])} style={{ width: size, height: size }} aria-hidden>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}
