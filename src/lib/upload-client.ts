"use client";

import { createUploadUrl, registerMedia, replaceMedia } from "@/app/admin/actions/media";
import { env } from "@/lib/env";
import { validateFile } from "@/lib/validation/media";
import type { Media } from "@/lib/types";

export type ProgressFn = (fraction: number) => void;

async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/") || file.type.includes("icon")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return size;
  } catch {
    return null;
  }
}

/**
 * PUTs the raw file to a Supabase Storage signed upload URL (same request
 * shape as storage-js `uploadToSignedUrl`), using XHR for progress events.
 */
function putWithProgress(signedUrl: string, file: File, onProgress?: ProgressFn): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("apikey", env.supabaseAnonKey);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Upload failed (${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = body.message || body.error || message;
      } catch {
        /* keep default */
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(file);
  });
}

async function uploadToStorage(file: File, accept: "image" | "document" | "audio" | "any", onProgress?: ProgressFn) {
  const invalid = validateFile(file, accept);
  if (invalid) throw new Error(invalid);
  const [target, dims] = await Promise.all([
    createUploadUrl({ fileName: file.name, mimeType: file.type, size: file.size }),
    imageSize(file),
  ]);
  if (!target.ok) throw new Error(target.error);
  if (!target.data) throw new Error("Could not prepare the upload.");
  await putWithProgress(target.data.signedUrl, file, onProgress);
  onProgress?.(1);
  return {
    path: target.data.path,
    fileName: file.name.slice(0, 255),
    mimeType: file.type,
    size: file.size,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
  };
}

export async function uploadMedia(
  file: File,
  opts: {
    accept?: "image" | "document" | "audio" | "any";
    altText?: string;
    inGallery?: boolean;
    onProgress?: ProgressFn;
  } = {},
): Promise<Media> {
  const uploaded = await uploadToStorage(file, opts.accept ?? "any", opts.onProgress);
  const res = await registerMedia({ ...uploaded, altText: opts.altText ?? "", inGallery: opts.inGallery });
  if (!res.ok || !res.data) throw new Error(res.ok ? "Upload failed." : res.error);
  return res.data;
}

export async function uploadReplacement(
  id: string,
  file: File,
  kind: "image" | "document" | "audio",
  onProgress?: ProgressFn,
): Promise<Media> {
  const uploaded = await uploadToStorage(file, kind, onProgress);
  const res = await replaceMedia(id, { ...uploaded, altText: "" });
  if (!res.ok || !res.data) throw new Error(res.ok ? "Replace failed." : res.error);
  return res.data;
}
