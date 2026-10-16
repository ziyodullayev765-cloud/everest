import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/site/section-heading";
import { SmartImage } from "@/components/ui/smart-image";
import { Reveal } from "@/components/ui/reveal";
import { getCopy } from "@/lib/i18n/server";
import { getPosts } from "@/lib/data/public";
import { fullDate } from "@/lib/i18n/dictionaries";
import { readingMinutes } from "@/lib/reading";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.blog.title, description: copy.blog.lead, alternates: { canonical: "/blog" } };
}

export default async function BlogPage() {
  const copy = await getCopy();
  const posts = await getPosts();
  return (
    <>
      <PageHeader eyebrow={copy.blog.eyebrow} title={copy.blog.title} lead={copy.blog.lead} />
      <section className="mx-auto w-[min(1200px,calc(100%-2rem))]">
        {posts.length === 0 ? (
          <p className="text-muted border-line rounded-3xl border border-dashed p-10 text-center">{copy.blog.empty}</p>
        ) : (
          <ol className="border-line border-t">
            {posts.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={Math.min(i, 6) * 0.04}>
                  <Link href={`/blog/${p.slug}`} className="post-row group">
                    <span className="post-row-meta">
                      {p.featured && <span className="post-row-pin">{copy.blog.pinned}</span>}
                      <time dateTime={p.published_at ?? p.created_at}>{fullDate(p.published_at ?? p.created_at, copy)}</time>
                      <span aria-hidden>·</span>
                      <span>
                        {readingMinutes(p.body)} {copy.blog.minRead}
                      </span>
                    </span>
                    <span className="post-row-main">
                      <span className="post-row-title">
                        {p.title}
                        <ArrowUpRight className="post-row-arrow" aria-hidden />
                      </span>
                      {p.excerpt && <span className="post-row-excerpt">{p.excerpt}</span>}
                      {p.tags.length > 0 && (
                        <span className="mt-3 flex flex-wrap gap-1.5">
                          {p.tags.map((t) => (
                            <span
                              key={t}
                              className="border-line rounded-full border px-2.5 py-0.5 text-[0.7rem] text-[var(--fg-secondary)]"
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    {p.cover_url && (
                      <span className="post-row-cover protected-media">
                        <SmartImage src={p.cover_url} alt={p.cover_alt || p.title} fill sizes="200px" className="object-cover" />
                      </span>
                    )}
                  </Link>
                </Reveal>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
