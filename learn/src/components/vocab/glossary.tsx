import { BookA } from "lucide-react";

/** Words from the student's own vocabulary lists that occur in a reading text. */
export function Glossary({ items }: { items: { english: string; uzbek: string; phonetic: string }[] }) {
  return (
    <details className="mt-5 rounded-xl border border-border bg-surface-2/60 px-4 py-3" open={items.length <= 8}>
      <summary className="flex cursor-pointer items-center gap-2 text-[13.5px] font-bold">
        <BookA className="size-4 text-primary" aria-hidden /> Matndagi lug‘at so‘zlari ({items.length})
      </summary>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {items.map((w) => (
          <div key={w.english} className="flex items-baseline gap-2 text-[13.5px]">
            <dt className="font-bold">{w.english}</dt>
            {w.phonetic ? <span className="text-[12px] text-muted">{w.phonetic}</span> : null}
            <dd className="min-w-0 truncate text-text-2">— {w.uzbek}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
