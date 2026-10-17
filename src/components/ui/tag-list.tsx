import { cn } from "@/lib/utils";

/**
 * Pill list for technologies and tags. `as="span"` keeps it valid inside links
 * (e.g. the blog list rows), where a <ul> is not allowed.
 */
export function TagList({
  tags,
  size = "md",
  as = "ul",
  className,
}: {
  tags: string[];
  size?: "sm" | "md";
  as?: "ul" | "span";
  className?: string;
}) {
  if (!tags.length) return null;
  const pill = cn(
    "border-line rounded-full border text-[var(--fg-secondary)]",
    size === "sm" ? "px-2.5 py-0.5 text-[0.7rem]" : "px-3 py-1 text-xs",
  );
  const box = cn("flex flex-wrap gap-1.5", className);
  if (as === "span")
    return (
      <span className={box}>
        {tags.map((t) => (
          <span key={t} className={pill}>
            {t}
          </span>
        ))}
      </span>
    );
  return (
    <ul className={box}>
      {tags.map((t) => (
        <li key={t} className={pill}>
          {t}
        </li>
      ))}
    </ul>
  );
}
