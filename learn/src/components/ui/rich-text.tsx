import katex from "katex";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders user-entered text safely: plain text with line breaks, http(s) links, and math between
 * $…$ (inline) or $$…$$ (block) via KaTeX. No raw HTML from users is ever injected — only KaTeX's own
 * escaped output (trust: false).
 */
function renderMath(tex: string, display: boolean) {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: "ignore", maxSize: 20, maxExpand: 200 });
}

function linkify(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /https?:\/\/[^\s<>"')]+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a key={`${keyBase}-${m.index}`} href={m[0]} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className, as: Tag = "div" }: { text: string; className?: string; as?: "div" | "span" | "p" }) {
  const parts: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={i++}>{linkify(text.slice(last, m.index), `t${i}`)}</Fragment>);
    const display = m[1] != null;
    parts.push(<span key={i++} className={display ? "my-2 block overflow-x-auto" : undefined} dangerouslySetInnerHTML={{ __html: renderMath(display ? m[1] : m[2], display) }} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{linkify(text.slice(last), `t${i}`)}</Fragment>);
  return <Tag className={cn("prose-text", className)}>{parts}</Tag>;
}
