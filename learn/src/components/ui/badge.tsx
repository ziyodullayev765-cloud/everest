import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "primary" | "info" | "warning" | "danger" | "success" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-text-2 ring-border",
  primary: "bg-primary-soft text-primary-soft-fg ring-primary/15",
  info: "bg-info-soft text-info ring-info/15",
  warning: "bg-warning-soft text-warning ring-warning/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  success: "bg-success-soft text-success ring-success/15",
  violet: "bg-violet-soft text-violet ring-violet/15",
};

export function Badge({ tone = "neutral", dot, className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset", tones[tone], className)} {...rest}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
