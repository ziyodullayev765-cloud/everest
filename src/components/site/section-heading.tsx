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
      <div className="max-w-4xl">
        {eyebrow && (
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 font-mono text-xs tracking-[0.2em] text-white/70 uppercase ring-1 ring-white/10">
            <span className="bg-rainbow size-1.5 rounded-full" aria-hidden />
            {eyebrow}
          </p>
        )}
        <Tag
          className={cn(
            "font-display tracking-[-0.03em]",
            Tag === "h1" ? "text-[clamp(2.6rem,9vw,7.5rem)] leading-[0.92]" : "text-[clamp(2.1rem,6vw,4.6rem)] leading-[0.95]",
          )}
        >
          <TitleWithAccent title={title} />
        </Tag>
        {lead && <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">{lead}</p>}
      </div>
      {children}
    </Reveal>
  );
}

/** Last word of a heading gets the animated rainbow treatment. */
function TitleWithAccent({ title }: { title: string }) {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return <span className="text-rainbow">{title}</span>;
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <span className="text-rainbow">{last}</span>
    </>
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
    <div className="glass flex min-h-48 items-center justify-center rounded-3xl border-dashed p-10 text-center text-white/60">
      <p>{children}</p>
    </div>
  );
}
