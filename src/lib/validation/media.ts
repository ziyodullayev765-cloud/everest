import { z } from "zod";
import { slugify } from "@/lib/utils";

/** Must stay in sync with the bucket config in the SQL migration. */
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;
export const DOCUMENT_TYPES = ["application/pdf"] as const;
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/x-m4a",
] as const;
export const ALLOWED_TYPES: readonly string[] = [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...AUDIO_TYPES];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/aac": "aac",
};

export type MediaKind = "image" | "document" | "audio";

export function mediaKind(mime: string): MediaKind | null {
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) return "image";
  if ((DOCUMENT_TYPES as readonly string[]).includes(mime)) return "document";
  if ((AUDIO_TYPES as readonly string[]).includes(mime)) return "audio";
  return null;
}

export function maxBytesFor(mime: string) {
  return mediaKind(mime) === "audio" ? MAX_AUDIO_BYTES : MAX_UPLOAD_BYTES;
}

export function validateFile(
  file: { name: string; type: string; size: number },
  accept: MediaKind | "any" = "any",
): string | null {
  const kind = mediaKind(file.type);
  if (!kind) return `“${file.name}”: unsupported file type. Use JPG, PNG, WebP, AVIF, GIF, ICO, PDF or MP3/M4A/OGG/WAV.`;
  if (accept !== "any" && kind !== accept)
    return `“${file.name}”: please choose ${accept === "image" ? "an image" : accept === "audio" ? "an audio file" : "a PDF document"}.`;
  if (file.size <= 0) return `“${file.name}” is empty.`;
  const max = maxBytesFor(file.type);
  if (file.size > max) return `“${file.name}” is larger than ${max / 1024 / 1024} MB.`;
  return null;
}

/** Descriptive, collision-free storage path, e.g. images/2026/10/my-photo-k3j9x2.jpg */
export function buildStoragePath(fileName: string, mime: string, now = new Date(), rand = Math.random()): string {
  const kind = mediaKind(mime) ?? "document";
  const base = slugify(fileName.replace(/\.[^.]+$/, "")).slice(0, 60) || "file";
  const ext = EXT[mime] ?? "bin";
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const suffix = rand.toString(36).slice(2, 8).padEnd(6, "0");
  return `${kind}s/${yyyy}/${mm}/${base}-${suffix}.${ext}`;
}

export const uploadRequestSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().refine((m) => ALLOWED_TYPES.includes(m), "Unsupported file type"),
    size: z.number().int().positive(),
  })
  .refine((v) => v.size <= maxBytesFor(v.mimeType), { message: "File is too large", path: ["size"] });

export const registerMediaSchema = z.object({
  path: z.string().regex(/^(images|documents|audios)\/\d{4}\/\d{2}\/[a-z0-9-]+\.[a-z0-9]+$/, "Invalid storage path"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine((m) => ALLOWED_TYPES.includes(m), "Unsupported file type"),
  size: z.number().int().positive().max(MAX_AUDIO_BYTES),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
  altText: z.string().trim().max(300).default(""),
  /** Publish images straight into the public gallery (and the 3D dome). */
  inGallery: z.boolean().optional(),
});

export const mediaMetaSchema = z.object({
  alt_text: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(600).default(""),
  category: z.string().trim().max(80).default(""),
  in_gallery: z.boolean(),
  status: z.enum(["draft", "published"]),
});
