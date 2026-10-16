import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Eyebrow + serif uppercase title + optional lead, used by every home section. */
export function HomeHeading({
  eyebrow,
  title,
  lead,
  center = false,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", center && "flex-col items-center text-center")}>
      <div className={cn(center && "flex flex-col items-center")}>
        <p className="ed-eyebrow">{eyebrow}</p>
        <h2 id={id} className="ed-title">
          {title}
        </h2>
        {lead && <p className={cn("ed-intro", center && "mx-auto")}>{lead}</p>}
      </div>
      {children}
    </div>
  );
}
