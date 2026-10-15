import Image, { type ImageProps } from "next/image";
import { env } from "@/lib/env";

/**
 * next/image for files in our Supabase bucket (optimised, responsive),
 * plain lazy <img> for any other host so arbitrary URLs never break the build.
 */
export function SmartImage(props: Omit<ImageProps, "src"> & { src: string }) {
  const { src, alt, fill, width, height, sizes, className, priority, style } = props;
  const optimisable = !!env.supabaseUrl && src.startsWith(env.supabaseUrl) && !/\.(ico|gif)(\?|$)/i.test(src);
  if (optimisable) return <Image {...props} src={src} alt={alt} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : (width as number | undefined)}
      height={fill ? undefined : (height as number | undefined)}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
    />
  );
}
