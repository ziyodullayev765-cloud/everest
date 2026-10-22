import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border-2 border-border bg-surface", className)} {...rest} />;
}

export function CardHeader({ title, description, action, className, icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary [&_svg]:size-[18px]">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="text-[16px] font-extrabold tracking-[-0.01em] text-text">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...rest} />;
}
