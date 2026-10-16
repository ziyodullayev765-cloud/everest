import type { Metadata } from "next";
import { DomeGallery, type DomeTileData } from "@/components/site/dome-gallery";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { PageNext } from "@/components/site/page-next";
import { getCopy } from "@/lib/i18n/server";
import { getGallery } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.gallery.title,
    description: copy.gallery.lead,
    alternates: { canonical: "/gallery" },
  };
}

/** Journey: a large draggable photo dome of every gallery photo. */
export default async function GalleryPage() {
  const copy = await getCopy();
  const media = await getGallery();
  const tiles: DomeTileData[] = media.map((m) => ({
    src: m.url,
    alt: m.alt_text || m.caption || m.file_name,
    label: m.caption,
  }));

  return (
    <>
      <PageHeader eyebrow={copy.homePage.galleryEyebrow} title={copy.gallery.title} lead={copy.gallery.lead} />
      <section aria-label={copy.homePage.domeLabel} className="relative">
        {tiles.length > 0 ? (
          <div className="relative h-[clamp(520px,86svh,980px)]">
            <DomeGallery tiles={tiles} fit={0.85} labels={{ dome: copy.homePage.domeLabel }} />
          </div>
        ) : (
          <div className="mx-auto w-[min(1200px,calc(100%-2rem))]">
            <EmptyState>{copy.gallery.empty}</EmptyState>
          </div>
        )}
      </section>

      <PageNext current="/gallery" />
    </>
  );
}
