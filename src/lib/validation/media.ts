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
export const ALLOWED_TYPES: readonly string[] = [...IMAGE_TYPES, ...DOCUMENT_TYPES];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf",
};

export function mediaKind(mime: string): "image" | "document" | null {
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) return "image";
  if ((DOCUMENT_TYPES as readonly string[]).includes(mime)) return "document";
  return null;
}

export function validateFile(
  file: { name: string; type: string; size: number },
  accept: "image" | "document" | "any" = "any",
): string | null {
  const kind = mediaKind(file.type);
  if (!kind) return `“${file.name}”: unsupported file type. Use JPG, PNG, WebP, AVIF, GIF, ICO or PDF.`;
  if (accept !== "any" && kind !== accept)
    return `“${file.name}”: please choose ${accept === "image" ? "an image" : "a PDF document"}.`;
  if (file.size <= 0) return `“${file.name}” is empty.`;
  if (file.size > MAX_UPLOAD_BYTES) return `“${file.name}” is larger than 10 MB.`;
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

export const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine((m) => ALLOWED_TYPES.includes(m), "Unsupported file type"),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, "File is larger than 10 MB"),
});

export const registerMediaSchema = z.object({
  path: z.string().regex(/^(images|documents)\/\d{4}\/\d{2}\/[a-z0-9-]+\.[a-z0-9]+$/, "Invalid storage path"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine((m) => ALLOWED_TYPES.includes(m), "Unsupported file type"),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
  altText: z.string().trim().max(300).default(""),
});

export const mediaMetaSchema = z.object({
  alt_text: z.string().trim().max(300).default(""),
  caption: z.string().trim().max(600).default(""),
  category: z.string().trim().max(80).default(""),
  in_gallery: z.boolean(),
  status: z.enum(["draft", "published"]),
});
