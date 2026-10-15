import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
  as: Tag = "h2",
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  className?: string;
  as?: "h1" | "h2";
  children?: React.ReactNode;
}) {
  return (
    <Reveal className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-accent mb-4 inline-flex items-center gap-2 font-mono text-xs tracking-[0.22em] uppercase">
            <span className="bg-accent h-px w-6" aria-hidden />
            {eyebrow}
          </p>
        )}
        <Tag
          className={cn(
            "text-gradient font-semibold tracking-[-0.035em]",
            Tag === "h1" ? "text-4xl leading-[1.02] sm:text-6xl lg:text-7xl" : "text-3xl leading-[1.05] sm:text-5xl",
          )}
        >
          {title}
        </Tag>
        {lead && <p className="text-muted mt-5 max-w-xl text-base leading-relaxed sm:text-lg">{lead}</p>}
      </div>
      {children}
    </Reveal>
  );
}

export function PageHeader(props: { eyebrow?: string; title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <header className="container-x pt-32 pb-12 sm:pt-40 sm:pb-16">
      <SectionHeading as="h1" {...props} />
    </header>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass text-muted flex min-h-48 items-center justify-center rounded-3xl p-10 text-center">
      <p>{children}</p>
    </div>
  );
}
