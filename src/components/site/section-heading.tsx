import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { getCopy } from "@/lib/i18n/server";

/**
 * Editorial header for every inner page: a breadcrumb back home, an eyebrow,
 * a large display-serif title whose last word turns to silver italic (the same
 * voice as the name on the home page), the intro, and a hairline to close it.
 */
export async function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  const copy = await getCopy();
  const words = title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return (
    <header className="mx-auto w-[min(1200px,calc(100%-2rem))] pt-28 pb-10 sm:pt-40 sm:pb-14">
      <nav aria-label="Breadcrumb" className="page-crumbs">
        <Link href="/">{copy.nav["/"]}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{title}</span>
      </nav>
      {eyebrow && <p className="ed-eyebrow mt-8">{eyebrow}</p>}
      <h1 className="page-title" aria-label={title}>
        <span aria-hidden>
          {[...words, ...(last ? [last] : [])].map((w, i, all) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span className="reveal-line">
                <span className="reveal-word" style={{ "--i": i } as CSSProperties}>
                  {last && i === all.length - 1 ? <em>{w}</em> : w}
                </span>
              </span>
            </Fragment>
          ))}
        </span>
      </h1>
      {lead && <p className="ed-intro page-lead">{lead}</p>}
      {children && <div className="mt-8">{children}</div>}
      <div className="hairline mt-10 sm:mt-14" aria-hidden />
    </header>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border-line-strong flex min-h-48 items-center justify-center rounded-3xl border border-dashed p-10 text-center text-[var(--fg-secondary)]">
      <p>{children}</p>
    </div>
  );
}
