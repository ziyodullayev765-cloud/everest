import { cn } from "@/lib/utils";

/** Everest mark: two layered peaks with a summit flag, in a rounded square. Used for app icons too. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={cn("shrink-0", className)} aria-hidden>
      <rect width="48" height="48" rx="13" fill="var(--primary)" />
      <path d="M9 35 L20.5 17 L27 27 L31 21.5 L39 35 Z" fill="var(--primary-fg)" opacity="0.38" />
      <path d="M13 35 L24 15.5 L35 35 Z" fill="var(--primary-fg)" />
      <path d="M24 15.5 L24 9.5 L29.5 11.6 L24 13.6" fill="none" stroke="var(--primary-fg)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M19.4 23.6 L24 20.4 L28.6 23.6" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ name = "Everest", className }: { name?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={30} />
      <span className="text-[16px] font-semibold tracking-[-0.02em] text-text">{name}</span>
    </span>
  );
}
