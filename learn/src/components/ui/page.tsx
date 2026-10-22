import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back, eyebrow, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string }; eyebrow?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-6 animate-fade-up", className)}>
      {back ? (
        <Link href={back.href} className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-[13px] font-semibold text-muted hover:text-text">
          <ChevronLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-1.5 text-[13px] text-muted">{eyebrow}</div> : null}
          <h1 className="text-[24px] leading-tight font-black tracking-[-0.02em] text-text sm:text-[28px]">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl text-[14px] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function StatCard({ label, value, hint, icon, tone = "primary", className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: "primary" | "info" | "warning" | "violet" | "danger" | "success"; className?: string }) {
  const tones = {
    primary: "bg-primary-soft text-primary-soft-fg",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    violet: "bg-violet-soft text-violet",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
  };
  return (
    <div className={cn("rounded-3xl border-2 border-border bg-surface p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-bold text-muted">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", tones[tone])}>{icon}</span>
      </div>
      <div className="tabular mt-3 text-[28px] leading-none font-black tracking-[-0.02em] text-text">{value}</div>
      {hint ? <div className="mt-2 text-[12.5px] text-muted">{hint}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold tracking-[-0.01em] text-text">{children}</h2>
      {action}
    </div>
  );
}
