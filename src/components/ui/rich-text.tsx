import { Fragment, type ReactNode } from "react";
import { cn, isSafeHref, slugify } from "@/lib/utils";

/**
 * Minimal, safe Markdown renderer for admin-authored text.
 * Supports paragraphs, ## / ### headings, - and 1. lists, **bold**, *italic*,
 * `code` and [links](https://…). It builds React elements directly — no HTML
 * string is ever injected, so content cannot introduce scripts.
 */
const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (!isSafeHref(href)) return <Fragment key={key}>{label}</Fragment>;
      const external = /^https?:/i.test(href!);
      return (
        <a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function withBreaks(lines: string[], key: string) {
  return lines.flatMap((line, i) =>
    i === 0 ? renderInline(line, `${key}-${i}`) : [<br key={`${key}-br${i}`} />, ...renderInline(line, `${key}-${i}`)],
  );
}

/** Anchor id for a heading, so a table of contents can link to it. */
export function headingId(text: string): string {
  return "h-" + (slugify(text.replace(/[*`[\]()]/g, "")) || "section");
}

/** "## Heading" lines of a text, for a table of contents. */
export function headingsOf(text: string): { id: string; text: string; level: 2 | 3 }[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.split("\n")[0]!.trim())
    .filter((l) => /^#{1,3}\s/.test(l))
    .map((l) => {
      const level = l.startsWith("###") ? 3 : 2;
      const t = l.replace(/^#{1,3}\s+/, "");
      return { id: headingId(t), text: t.replace(/[*`]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"), level: level as 2 | 3 };
    });
}

export function RichText({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text?.trim()) return null;
  const blocks = text
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/);

  return (
    <div className={cn("prose-rich", className)}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const key = `b${bi}`;
        if (/^###\s/.test(lines[0]!)) {
          const t = lines[0]!.replace(/^###\s+/, "");
          return (
            <h3 key={key} id={headingId(t)}>
              {renderInline(t, key)}
            </h3>
          );
        }
        if (/^##?\s/.test(lines[0]!)) {
          const t = lines[0]!.replace(/^##?\s+/, "");
          return (
            <h2 key={key} id={headingId(t)}>
              {renderInline(t, key)}
            </h2>
          );
        }
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={key}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-*•]\s+/, ""), `${key}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={key}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*\d+[.)]\s+/, ""), `${key}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        return <p key={key}>{withBreaks(lines, key)}</p>;
      })}
    </div>
  );
}
