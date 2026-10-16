import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Reveal } from "@/components/ui/reveal";
import { RichText } from "@/components/ui/rich-text";
import { getCopy } from "@/lib/i18n/server";
import { getPostBySlug, getProfile, getSettings } from "@/lib/data/public";
import { fullDate } from "@/lib/i18n/dictionaries";
import { ownerName } from "@/lib/defaults";
import { readingMinutes } from "@/lib/reading";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPostBySlug(slug);
  if (!p) notFound();
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${p.slug}`,
      publishedTime: p.published_at ?? undefined,
      images: p.cover_url ? [{ url: p.cover_url, alt: p.cover_alt || p.title }] : ["/og"],
    },
    twitter: { card: p.cover_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function PostPage({ params }: Params) {
  const copy = await getCopy();
  const { slug } = await params;
  const [post, profile, settings] = await Promise.all([getPostBySlug(slug), getProfile(), getSettings()]);
  if (!post) notFound();
  const date = post.published_at ?? post.created_at;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_url || undefined,
    datePublished: date,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: ownerName(profile, settings) },
    keywords: post.tags.join(", ") || undefined,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="mx-auto w-[min(820px,calc(100%-2rem))] pt-28 sm:pt-40">
        <nav aria-label="Breadcrumb" className="page-crumbs">
          <Link href="/">{copy.nav["/"]}</Link>
          <span aria-hidden>/</span>
          <Link href="/blog">{copy.blog.title}</Link>
        </nav>
        <p className="ed-eyebrow mt-8">
          <time dateTime={date}>{fullDate(date, copy)}</time> · {readingMinutes(post.body)} {copy.blog.minRead}
        </p>
        <h1 className="page-title post-title">{post.title}</h1>
        {post.excerpt && <p className="ed-intro page-lead">{post.excerpt}</p>}
        {post.tags.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <li key={t} className="border-line rounded-full border px-3 py-1 text-xs text-[var(--fg-secondary)]">
                {t}
              </li>
            ))}
          </ul>
        )}
      </header>

      {post.cover_url && (
        <Reveal className="protected-media relative mx-auto mt-12 aspect-[16/9] w-[min(1080px,calc(100%-2rem))] overflow-hidden rounded-[2rem] border border-[var(--line)]">
          <SmartImage
            src={post.cover_url}
            alt={post.cover_alt || post.title}
            fill
            priority
            sizes="(min-width: 1100px) 1080px, 100vw"
            className="object-cover"
          />
        </Reveal>
      )}

      <Reveal className="post-body mx-auto mt-14 w-[min(720px,calc(100%-2rem))]">
        <RichText text={post.body} />
      </Reveal>

      <div className="mx-auto mt-20 w-[min(720px,calc(100%-2rem))]">
        <Link href="/blog" className="ed-button">
          <ArrowLeft className="size-4" aria-hidden />
          {copy.blog.back}
        </Link>
      </div>
    </article>
  );
}
