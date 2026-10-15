import type { Metadata } from "next";
import { DomeGallery, type DomeTileData } from "@/components/site/dome-gallery";
import { EdSection } from "@/components/site/ed-section";
import { ImageGallery } from "@/components/site/image-gallery";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { HomeHeading } from "@/components/home/section-heading";
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

/** Journey: a large draggable photo dome on top, then every photo in a grid. */
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
            <DomeGallery
              tiles={tiles}
              fit={0.85}
              maxVerticalDeg={35}
              labels={{ dome: copy.homePage.domeLabel, close: copy.homePage.close }}
            />
          </div>
        ) : (
          <div className="mx-auto w-[min(1200px,calc(100%-2rem))]">
            <EmptyState>{copy.gallery.empty}</EmptyState>
          </div>
        )}
      </section>

      {media.length > 0 && (
        <EdSection className="mx-auto w-[min(1200px,calc(100%-2rem))] py-24">
          <HomeHeading
            eyebrow={`${media.length} ${copy.homePage.photos}`}
            title={copy.homePage.everyMoment}
            lead={copy.homePage.tapToOpen}
          />
          <div className="mt-12">
            <ImageGallery
              images={media.map((m) => ({
                src: m.url,
                alt: m.alt_text || m.caption || m.file_name,
                caption: m.caption,
                category: m.category,
                width: m.width,
                height: m.height,
              }))}
            />
          </div>
        </EdSection>
      )}
      <PageNext current="/gallery" />
    </>
  );
}
