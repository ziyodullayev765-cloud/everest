"use client";
import { useState } from "react";
import { Music, X } from "lucide-react";
import { FileChip, fmtSize, type UploadedFile } from "./uploader";

/** Audio track with native controls (streams via the authorised, Range-capable file route). */
export function AudioPlayer({ file, title }: { file: Pick<UploadedFile, "id" | "name" | "size">; title?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2 text-[13.5px]">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-soft text-violet">
          <Music className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{title || file.name}</span>
        {file.size ? <span className="shrink-0 text-[11.5px] text-muted">{fmtSize(file.size)}</span> : null}
      </div>
      <audio controls preload="metadata" src={`/api/files/${file.id}`} className="w-full" controlsList="nodownload">
        Brauzeringiz audioni qo‘llab-quvvatlamaydi.
      </audio>
    </div>
  );
}

/** Attachments split by kind: photos (e.g. the board) as a tap-to-enlarge grid, audio as players, the rest as chips. */
export function MediaGallery({ files }: { files: UploadedFile[] }) {
  const [open, setOpen] = useState<UploadedFile | null>(null);
  const images = files.filter((f) => f.mime.startsWith("image/"));
  const audio = files.filter((f) => f.mime.startsWith("audio/"));
  const other = files.filter((f) => !f.mime.startsWith("image/") && !f.mime.startsWith("audio/"));
  return (
    <div className="space-y-3">
      {images.length ? (
        <div className={images.length === 1 ? "" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
          {images.map((f) => (
            <button key={f.id} type="button" onClick={() => setOpen(f)} className="group block w-full overflow-hidden rounded-xl border border-border bg-surface-2" aria-label={`${f.name} — kattalashtirish`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${f.id}`} alt={f.name} loading="lazy" className={images.length === 1 ? "max-h-[28rem] w-full object-contain" : "aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"} />
            </button>
          ))}
        </div>
      ) : null}
      {audio.map((f) => (
        <AudioPlayer key={f.id} file={f} />
      ))}
      {other.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {other.map((f) => (
            <FileChip key={f.id} f={f} />
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 pt-safe pb-safe" role="dialog" aria-modal="true" aria-label={open.name} onClick={() => setOpen(null)}>
          <button className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-3 grid size-10 place-items-center rounded-full bg-white/15 text-white" aria-label="Yopish">
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${open.id}`} alt={open.name} className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Listening clip with an optional play limit. The limit is counted in this browser (localStorage),
 * so it guides practice but is not a security control — the UI says so to teachers.
 */
export function ListeningPlayer({ fileId, limit, storageKey, title = "Listening" }: { fileId: string; limit: number | null; storageKey: string; title?: string }) {
  const key = `plays:${storageKey}`;
  const [plays, setPlays] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      return Number(localStorage.getItem(key)) || 0;
    } catch {
      return 0;
    }
  });
  const [counted, setCounted] = useState(false);
  const left = limit ? Math.max(0, limit - plays) : null;
  const blocked = left === 0 && !counted;
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2 text-[13.5px]">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-soft text-violet">
          <Music className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        {limit ? <span className="shrink-0 text-[12px] text-muted tabular">Qolgan tinglash: {left}</span> : null}
      </div>
      {blocked ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] text-muted">Tinglash chegarasi tugadi.</p>
      ) : (
        <audio
          controls
          preload="metadata"
          src={`/api/files/${fileId}`}
          className="w-full"
          controlsList="nodownload noplaybackrate"
          onPlay={(e) => {
            if (!limit || counted) return;
            if (plays >= limit) {
              e.currentTarget.pause();
              return;
            }
            const n = plays + 1;
            setPlays(n);
            setCounted(true);
            try {
              localStorage.setItem(key, String(n));
            } catch {}
          }}
          onEnded={() => setCounted(false)}
        >
          Brauzeringiz audioni qo‘llab-quvvatlamaydi.
        </audio>
      )}
    </div>
  );
}
