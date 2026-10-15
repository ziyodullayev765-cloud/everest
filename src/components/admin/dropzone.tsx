"use client";

import { useCallback, useId, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { uploadMedia } from "@/lib/upload-client";
import { validateFile } from "@/lib/validation/media";
import type { Media } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

interface Job {
  id: string;
  name: string;
  size: number;
  progress: number;
  state: "uploading" | "done" | "error";
  error?: string;
}

const ACCEPT_ATTR = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif,image/x-icon,image/vnd.microsoft.icon",
  document: "application/pdf",
  audio: "audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/webm,audio/aac,.mp3,.m4a",
  any: "image/jpeg,image/png,image/webp,image/avif,image/gif,image/x-icon,image/vnd.microsoft.icon,application/pdf,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/webm,audio/aac",
};

export function Dropzone({
  accept = "any",
  multiple = true,
  onUploaded,
  compact,
}: {
  accept?: "image" | "document" | "audio" | "any";
  multiple?: boolean;
  onUploaded: (media: Media) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);

  const update = (id: string, patch: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, multiple ? 20 : 1);
      await Promise.all(
        list.map(async (file) => {
          const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
          const invalid = validateFile(file, accept);
          setJobs((js) => [
            ...js,
            {
              id,
              name: file.name,
              size: file.size,
              progress: 0,
              state: invalid ? "error" : "uploading",
              error: invalid ?? undefined,
            },
          ]);
          if (invalid) return;
          try {
            const media = await uploadMedia(file, {
              accept,
              altText: file.name
                .replace(/\.[^.]+$/, "")
                .replace(/[-_]+/g, " ")
                .slice(0, 300),
              onProgress: (p) => update(id, { progress: p }),
            });
            update(id, { state: "done", progress: 1 });
            onUploaded(media);
          } catch (e) {
            update(id, { state: "error", error: e instanceof Error ? e.message : "Upload failed." });
          }
        }),
      );
    },
    [accept, multiple, onUploaded],
  );

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed text-center transition",
          compact ? "px-4 py-6" : "px-6 py-12",
          dragging
            ? "border-accent bg-accent/10"
            : "border-line-strong hover:border-accent/60 bg-white/[0.02] hover:bg-white/[0.04]",
        )}
      >
        <FileUp className="text-accent size-6" aria-hidden />
        <span className="mt-3 text-sm font-medium">Drop files here or click to browse</span>
        <span className="text-subtle mt-1 text-xs">
          {accept === "document"
            ? "PDF · max 10 MB"
            : accept === "image"
              ? "JPG, PNG, WebP, AVIF, GIF, ICO · max 10 MB"
              : accept === "audio"
                ? "MP3, M4A, OGG, WAV · max 15 MB"
                : "Images, PDF (10 MB) or audio (15 MB)"}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={ACCEPT_ATTR[accept]}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {jobs.length > 0 && (
        <ul className="mt-4 grid gap-2" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.id} className="border-line rounded-xl border bg-white/[0.02] px-3 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                {j.state === "uploading" && <Loader2 className="text-accent size-4 shrink-0 animate-spin" aria-hidden />}
                {j.state === "done" && <CheckCircle2 className="text-accent size-4 shrink-0" aria-hidden />}
                {j.state === "error" && <XCircle className="size-4 shrink-0 text-red-300" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{j.name}</span>
                <span className="text-subtle text-xs">{formatBytes(j.size)}</span>
              </div>
              {j.state === "uploading" && (
                <div
                  className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={Math.round(j.progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${j.name}`}
                >
                  <div className="bg-accent h-full transition-[width]" style={{ width: `${Math.max(4, j.progress * 100)}%` }} />
                </div>
              )}
              {j.error && <p className="mt-1 text-xs text-red-300">{j.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
