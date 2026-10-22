"use client";
import { useCallback, useRef, useState } from "react";
import { PdfReader, downloadFile } from "./pdf-reader";
import { FileText, ImageIcon, Loader2, Music, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export type UploadedFile = { id: string; name: string; mime: string; size: number };

import { fmtSize } from "@/lib/utils";
export { fmtSize };

type UploadConfig = { mode: "blob"; prefix: string; maxBytes: number } | { mode: "db"; maxBytes: number };
let configPromise: Promise<UploadConfig> | null = null;
function uploadConfig(): Promise<UploadConfig> {
  configPromise ??= fetch("/api/files/config")
    .then((r) => r.json())
    .then((b) => (b?.ok ? b.data : { mode: "db", maxBytes: 4 * 1024 * 1024 }))
    .catch(() => {
      configPromise = null;
      return { mode: "db", maxBytes: 4 * 1024 * 1024 } as UploadConfig;
    });
  return configPromise;
}

const asciiName = (n: string) => n.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-80) || "file";

/**
 * Uploads a file. Large files (books, audio) go straight to private object storage when it's configured;
 * otherwise through /api/files (≤ 4 MB). The server re-checks every file's real type.
 */
export async function uploadFile(file: File, opts: { visibility?: "public" | "private"; imagesOnly?: boolean; onProgress?: (pct: number) => void } = {}): Promise<UploadedFile> {
  const cfg = await uploadConfig();
  if (file.size > cfg.maxBytes) throw new Error(`Fayl juda katta (ko‘pi bilan ${Math.round(cfg.maxBytes / 1024 / 1024)} MB).`);
  if (cfg.mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    let blob: { pathname: string };
    try {
      blob = await upload(`${cfg.prefix}${asciiName(file.name)}`, file, {
        access: "private",
        handleUploadUrl: "/api/files/blob",
        clientPayload: opts.imagesOnly ? "imagesOnly" : "",
        multipart: file.size > 20 * 1024 * 1024,
        contentType: file.type || undefined,
        onUploadProgress: (e) => opts.onProgress?.(Math.round(e.percentage)),
      });
    } catch (e) {
      throw new Error(navigator.onLine ? `Yuklanmadi: ${(e as Error).message}` : "Internet aloqasi yo‘q. Fayl yuklanmadi.");
    }
    const res = await fetch("/api/files/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathname: blob.pathname, name: file.name, visibility: opts.visibility, imagesOnly: opts.imagesOnly }) });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Fayl saqlanmadi.");
    return body.data;
  }
  const fd = new FormData();
  fd.append("file", file);
  if (opts.visibility) fd.append("visibility", opts.visibility);
  if (opts.imagesOnly) fd.append("imagesOnly", "1");
  let res: Response;
  try {
    res = await fetch("/api/files", { method: "POST", body: fd });
  } catch {
    throw new Error("Internet aloqasi yo‘q. Fayl yuklanmadi.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) throw new Error(body?.error ?? "Fayl yuklanmadi.");
  return body.data;
}

export function FileChip({ f, onRemove, href = true }: { f: UploadedFile; onRemove?: () => void; href?: boolean }) {
  const [reading, setReading] = useState(false);
  const closeReader = useCallback(() => setReading(false), []);
  const Icon = f.mime.startsWith("image/") ? ImageIcon : f.mime.startsWith("audio/") ? Music : FileText;
  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-2">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-text">{f.name}</span>
        <span className="block text-[11.5px] text-muted">{fmtSize(f.size)}</span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 pr-2.5">
      {href ? (
        // Opened in-app (PDF reader / same-tab download): a new tab loses the session inside the installed app.
        <button type="button" onClick={() => (f.mime === "application/pdf" ? setReading(true) : downloadFile(f))} className="flex min-w-0 flex-1 items-center gap-2.5 text-left hover:opacity-80">
          {inner}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">{inner}</div>
      )}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" aria-label={`${f.name} faylini olib tashlash`}>
          <X className="size-4" />
        </button>
      ) : null}
      {reading ? <PdfReader file={f} onClose={closeReader} /> : null}
    </div>
  );
}

export function Uploader({ files, onChange, max = 10, disabled, visibility, imagesOnly, label = "Fayl biriktirish", accept }: { files: UploadedFile[]; onChange: (f: UploadedFile[]) => void; max?: number; disabled?: boolean; visibility?: "public" | "private"; imagesOnly?: boolean; label?: string; accept?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [pct, setPct] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    const room = max - files.length;
    const picked = [...list].slice(0, room);
    if (list.length > room) toast.error(`Ko‘pi bilan ${max} ta fayl.`);
    let current = files;
    for (const f of picked) {
      setBusy((b) => b + 1);
      try {
        const up = await uploadFile(f, { visibility, imagesOnly, onProgress: setPct });
        current = [...current, up];
        onChange(current);
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      } finally {
        setBusy((b) => b - 1);
        setPct(null);
      }
    }
  };
  return (
    <div className="space-y-2">
      {files.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((f) => (
            <FileChip key={f.id} f={f} onRemove={disabled ? undefined : () => onChange(files.filter((x) => x.id !== f.id))} />
          ))}
        </div>
      ) : null}
      {!disabled && files.length < max ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            add(e.dataTransfer.files);
          }}
          className={cn("flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-4 text-[13.5px] font-semibold text-text-2 transition hover:border-primary hover:text-primary", drag && "border-primary bg-primary-soft text-primary")}
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Paperclip className="size-4" aria-hidden />}
          {busy ? `Yuklanmoqda…${pct != null ? ` ${pct}%` : ""}` : label}
          <span className="hidden font-normal text-muted sm:inline">· rasm, audio, PDF, DOCX, PPTX, TXT</span>
        </button>
      ) : null}
      <input
        ref={input}
        type="file"
        multiple={max > 1}
        hidden
        accept={accept ?? (imagesOnly ? "image/png,image/jpeg,image/webp,image/gif" : "image/*,audio/*,.pdf,.docx,.xlsx,.pptx,.txt,.mp3,.m4a,.wav,.ogg")}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
