import { Fragment, type ReactNode } from "react";
import { cn, isSafeHref } from "@/lib/utils";

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
        if (/^###\s/.test(lines[0]!)) return <h3 key={key}>{renderInline(lines[0]!.replace(/^###\s+/, ""), key)}</h3>;
        if (/^##?\s/.test(lines[0]!)) return <h2 key={key}>{renderInline(lines[0]!.replace(/^##?\s+/, ""), key)}</h2>;
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
