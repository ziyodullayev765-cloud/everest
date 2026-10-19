import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Reveal } from "@/components/ui/reveal";
import { RichText, headingsOf } from "@/components/ui/rich-text";
import { CopyLink, PostToc, ReadingProgress } from "@/components/site/post-tools";
import { getCopy } from "@/lib/i18n/server";
import { getPostBySlug, getProfile, getSettings } from "@/lib/data/public";
import { fullDate } from "@/lib/i18n/dictionaries";
import { ownerName } from "@/lib/defaults";
import { readingMinutes } from "@/lib/reading";
import { TagList } from "@/components/ui/tag-list";

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
      images: p.cover_url
        ? [{ url: p.cover_url, alt: p.cover_alt || p.title }]
        : [{ url: `/og?kicker=Blog&title=${encodeURIComponent(p.title)}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PostPage({ params }: Params) {
  const copy = await getCopy();
  const { slug } = await params;
  const [post, profile, settings] = await Promise.all([getPostBySlug(slug), getProfile(), getSettings()]);
  if (!post) notFound();
  const date = post.published_at ?? post.created_at;
  const toc = headingsOf(post.body);

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
        <TagList tags={post.tags} className="mt-6" />
      </header>

      {post.cover_url && (
        <div
          data-vt-hero=""
          className="protected-media page-hero-media relative mx-auto mt-12 aspect-[16/9] w-[min(1080px,calc(100%-2rem))] overflow-hidden rounded-[2rem] border border-[var(--line)]"
        >
          <SmartImage
            src={post.cover_url}
            alt={post.cover_alt || post.title}
            fill
            priority
            sizes="(min-width: 1100px) 1080px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <ReadingProgress />
      <div className="mx-auto mt-14 grid w-[min(1200px,calc(100%-2rem))] gap-10 lg:grid-cols-[1fr_minmax(0,720px)_1fr]">
        <Reveal className="post-body min-w-0 lg:col-start-2">
          <RichText text={post.body} />
        </Reveal>
        {toc.length >= 2 && (
          <aside className="-order-1 lg:order-none lg:col-start-3">
            <div className="lg:sticky lg:top-28 lg:max-w-[240px]">
              <PostToc items={toc} />
            </div>
          </aside>
        )}
      </div>

      <div className="mx-auto mt-20 flex w-[min(720px,calc(100%-2rem))] flex-wrap gap-3">
        <Link href="/blog" className="ed-button">
          <ArrowLeft className="size-4" aria-hidden />
          {copy.blog.back}
        </Link>
        <CopyLink />
      </div>
    </article>
  );
}
