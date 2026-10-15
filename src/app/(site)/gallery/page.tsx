import type { Metadata } from "next";
import { DomeGallery, type DomeTileData } from "@/components/site/dome-gallery";
import { EdSection } from "@/components/site/ed-section";
import { ImageGallery } from "@/components/site/image-gallery";
import { EmptyState } from "@/components/site/section-heading";
import { HomeHeading } from "@/components/home/section-heading";
import { copy } from "@/lib/copy";
import { getGallery } from "@/lib/data/public";

export const metadata: Metadata = {
  title: copy.gallery.title,
  description: copy.gallery.lead,
  alternates: { canonical: "/gallery" },
};

/** Journey: a large draggable photo dome on top, then every photo in a grid. */
export default async function GalleryPage() {
  const media = await getGallery();
  const tiles: DomeTileData[] = media.map((m) => ({
    src: m.url,
    alt: m.alt_text || m.caption || m.file_name,
    label: m.caption,
  }));

  return (
    <>
      <section aria-labelledby="journey-title" className="relative">
        <header className="mx-auto w-[min(1200px,calc(100%-2rem))] pt-32 sm:pt-36">
          <p className="ed-eyebrow">Gallery</p>
          <h1 id="journey-title" className="ed-title text-[clamp(2.6rem,7vw,4.5rem)]">
            {copy.gallery.title}
          </h1>
          <p className="ed-intro">{copy.gallery.lead}</p>
        </header>
        {tiles.length > 0 ? (
          <div className="border-line relative mt-8 h-[clamp(520px,86svh,980px)] border-t">
            <DomeGallery tiles={tiles} fit={0.85} maxVerticalDeg={35} />
          </div>
        ) : (
          <div className="mx-auto mt-10 w-[min(1200px,calc(100%-2rem))]">
            <EmptyState>{copy.gallery.empty}</EmptyState>
          </div>
        )}
      </section>

      {media.length > 0 && (
        <EdSection className="mx-auto w-[min(1200px,calc(100%-2rem))] py-24">
          <HomeHeading eyebrow={`${media.length} photos`} title="Every moment" lead="Tap any photo to open it." />
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
    </>
  );
}
