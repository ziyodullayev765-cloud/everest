import type { ReactNode } from "react";
import { trNode } from "@/lib/i18n/node";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({ icon, title, description, action, className }: { icon: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  title = trNode(title); description = trNode(description);
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg [&_svg]:size-6">
        <span className="absolute inset-0 rounded-2xl ring-8 ring-primary-soft/40" aria-hidden />
        {icon}
      </div>
      <h3 className="text-[15px] font-bold text-text">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const alertTones = {
  info: { cls: "bg-info-soft text-info border-info/20", icon: Info },
  success: { cls: "bg-success-soft text-success border-success/20", icon: CheckCircle2 },
  warning: { cls: "bg-warning-soft text-warning border-warning/20", icon: AlertTriangle },
  danger: { cls: "bg-danger-soft text-danger border-danger/20", icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof alertTones; title?: ReactNode; children?: ReactNode; className?: string }) {
  title = trNode(title); children = trNode(children);
  const t = alertTones[tone];
  const Icon = t.icon;
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-[13.5px]", t.cls, className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 text-text-2">
        {title ? <p className="font-bold text-text">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, className, tone = "primary", label }: { value: number; className?: string; tone?: "primary" | "warning" | "danger" | "info"; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = { primary: "bg-primary", warning: "bg-warning", danger: "bg-danger", info: "bg-info" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Ring({ value, size = 56, stroke = 6, children, className }: { value: number; size?: number; stroke?: number; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
