"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { Check, Link2 } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/** Thin bar at the top of the window that fills as the article is read. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-[var(--name-tint)]"
      style={{ scaleX }}
    />
  );
}

export function CopyLink() {
  const copy = useCopy();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ed-button"
      onClick={() =>
        navigator.clipboard.writeText(location.href.split("#")[0]!).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1800);
          },
          () => {},
        )
      }
    >
      {done ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      <span aria-live="polite">{done ? copy.post.copied : copy.post.copyLink}</span>
    </button>
  );
}

/** Table of contents that highlights the section being read. */
export function PostToc({ items }: { items: { id: string; text: string; level: 2 | 3 }[] }) {
  const copy = useCopy();
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label={copy.post.contents} className="text-sm">
      <p className="text-subtle mb-3 text-[0.7rem] tracking-[0.18em] uppercase">{copy.post.contents}</p>
      <ol className="border-line grid gap-2 border-l">
        {items.map((i) => (
          <li key={i.id} className={cn(i.level === 3 && "pl-3")}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l-2 py-0.5 pl-4 transition",
                active === i.id
                  ? "border-[var(--name-tint)] text-[var(--fg)]"
                  : "border-transparent text-[var(--fg-secondary)] hover:text-[var(--fg)]",
              )}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
