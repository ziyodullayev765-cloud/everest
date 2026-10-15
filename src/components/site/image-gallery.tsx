import { SmartImage } from "@/components/ui/smart-image";

export interface GalleryItem {
  src: string;
  alt: string;
  caption?: string;
  category?: string;
  width?: number | null;
  height?: number | null;
}

/**
 * Masonry grid of photos. View-only: no click-to-enlarge, and the images
 * can't be dragged out or opened from the context menu (see `.protected-media`).
 */
export function ImageGallery({ images }: { images: GalleryItem[] }) {
  return (
    <ul className="columns-2 gap-2.5 sm:columns-2 sm:gap-4 lg:columns-3 [&>li]:mb-2.5 sm:[&>li]:mb-4">
      {images.map((img, i) => (
        <li key={`${img.src}-${i}`} className="break-inside-avoid">
          <figure className="protected-media border-line bg-bg-elevated relative overflow-hidden rounded-2xl border">
            <SmartImage
              src={img.src}
              alt={img.alt}
              width={img.width ?? 1200}
              height={img.height ?? 900}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="h-auto w-full object-cover"
            />
            {(img.caption || img.category) && (
              <figcaption className="text-muted px-4 py-3 text-sm">
                {img.category && (
                  <span className="text-accent mr-2 font-mono text-[0.68rem] tracking-[0.16em] uppercase">{img.category}</span>
                )}
                {img.caption}
              </figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  );
}
