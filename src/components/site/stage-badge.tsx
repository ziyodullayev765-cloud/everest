import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  live: "bg-emerald-400",
  in_progress: "bg-[var(--name-tint)]",
  completed: "bg-[var(--fg-secondary)]",
};

/** "● Live" / "● In progress" / "● Completed" next to a project. */
export function StageBadge({
  stage,
  label,
  className,
}: {
  stage: string | null | undefined;
  label?: string;
  className?: string;
}) {
  if (!stage || !label) return null;
  return (
    <span
      className={cn(
        "border-line inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-medium tracking-[0.06em] text-[var(--fg-secondary)] uppercase",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {stage === "live" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", DOT[stage])} />
      </span>
      {label}
    </span>
  );
}
