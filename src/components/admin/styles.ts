import { cn } from "@/lib/utils";

/** Pure class helpers — safe to call from Server and Client Components alike. */
export const inputClass =
  "w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle transition focus:border-accent/70 focus:bg-white/[0.05] focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-red-400/70";

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function btnClass(variant: BtnVariant = "secondary", size: "sm" | "md" = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-accent text-black hover:brightness-110",
    variant === "secondary" && "border border-line bg-white/[0.04] text-fg hover:bg-white/[0.08]",
    variant === "ghost" && "text-muted hover:bg-white/[0.06] hover:text-fg",
    variant === "danger" && "border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
    className,
  );
}
