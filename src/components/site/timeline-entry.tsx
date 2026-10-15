import { ExternalLink, MapPin } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { RichText } from "@/components/ui/rich-text";
import { Reveal } from "@/components/ui/reveal";
import { formatRange } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  location?: string;
  start: string | null;
  end: string | null;
  current: boolean;
  description?: string;
  highlights?: string[];
  image?: string | null;
  url?: string | null;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="border-line relative border-l pl-6 sm:pl-8">
      {items.map((it, i) => (
        <li key={it.id} className="relative pb-12 last:pb-0">
          <span
            aria-hidden
            className="border-accent bg-bg absolute top-1.5 -left-[31px] block size-3 rounded-full border-2 sm:-left-[39px]"
          />
          <Reveal delay={Math.min(i, 4) * 0.05}>
            <p className="text-subtle font-mono text-xs tracking-[0.16em] uppercase">
              {formatRange(it.start, it.end, it.current)}
              {it.meta && <span className="text-accent"> · {it.meta}</span>}
            </p>
            <div className="mt-2 flex items-start gap-4">
              {it.image && (
                <div className="border-line relative size-12 shrink-0 overflow-hidden rounded-xl border bg-white/5">
                  <SmartImage src={it.image} alt="" fill sizes="48px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-xl font-semibold tracking-tight">{it.title}</h3>
                <p className="text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {it.url ? (
                    <a
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent inline-flex items-center gap-1"
                    >
                      {it.subtitle}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <span>{it.subtitle}</span>
                  )}
                  {it.location && (
                    <span className="text-subtle inline-flex items-center gap-1 text-sm">
                      <MapPin className="size-3.5" aria-hidden />
                      {it.location}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {it.description && <RichText text={it.description} className="mt-4 text-[0.97rem]" />}
            {it.highlights && it.highlights.length > 0 && (
              <ul className="prose-rich mt-4 text-[0.97rem]">
                {it.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
