import type { Metadata } from "next";
import { ImageGallery } from "@/components/site/image-gallery";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { copy } from "@/lib/copy";
import { getGallery } from "@/lib/data/public";

export const metadata: Metadata = {
  title: copy.gallery.title,
  description: copy.gallery.lead,
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const media = await getGallery();
  return (
    <>
      <PageHeader title={copy.gallery.title} lead={copy.gallery.lead} />
      <section className="container-x">
        {media.length ? (
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
        ) : (
          <EmptyState>{copy.gallery.empty}</EmptyState>
        )}
      </section>
    </>
  );
}
