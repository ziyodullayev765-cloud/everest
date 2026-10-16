import { EdSection } from "@/components/site/ed-section";
import { SmartImage } from "@/components/ui/smart-image";
import { getCopy } from "@/lib/i18n/server";
import type { Testimonial } from "@/lib/types";
import { initials, isSafeHref } from "@/lib/utils";
import { HomeHeading } from "./section-heading";

/** Quotes from people the owner worked with. Hidden until at least one is published. */
export async function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;
  const copy = await getCopy();
  return (
    <EdSection id="testimonials" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-14 sm:py-24">
      <HomeHeading eyebrow={copy.testimonials.eyebrow} title={copy.testimonials.title} />
      <div data-stagger className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => {
          const who = [t.role, t.organization].filter(Boolean).join(" · ");
          const name =
            t.url && isSafeHref(t.url) ? (
              <a href={t.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {t.name}
              </a>
            ) : (
              t.name
            );
          return (
            <figure key={t.id} className="quote-card">
              <span className="quote-mark" aria-hidden>
                “
              </span>
              <blockquote className="text-[1.05rem] leading-relaxed text-[var(--fg-secondary)]">{t.quote}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                <span className="border-line relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border text-xs font-medium">
                  {t.avatar_url ? (
                    <SmartImage src={t.avatar_url} alt="" fill sizes="44px" className="object-cover" />
                  ) : (
                    initials(t.name)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{name}</span>
                  {who && <span className="text-muted block truncate text-sm">{who}</span>}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </EdSection>
  );
}
