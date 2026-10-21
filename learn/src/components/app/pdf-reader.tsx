"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Download, Loader2, Minus, Plus, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { cn, fmtSize } from "@/lib/utils";
import { Button, buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type FileRef = { id: string; name: string; size?: number };

/**
 * Opening a PDF in a new tab fails on phones: an installed iOS app hands the link to Safari (no session cookie),
 * and Android Chrome has no inline viewer and downloads without cookies. So PDFs are rendered in-app with pdf.js,
 * fetched over the same authorised, Range-capable route — only the pages being read are downloaded.
 */
export function PdfReader({ file, onClose }: { file: FileRef; onClose: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [ratio, setRatio] = useState(1.414);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const storeKey = `pdf-page:${file.id}`;

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const task = pdfjs.getDocument({ url: `/api/files/${file.id}`, withCredentials: true, disableAutoFetch: true, rangeChunkSize: 512 * 1024, isEvalSupported: false });
        loaded = await task.promise;
        if (cancelled) return void loaded.destroy();
        const first = await loaded.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setRatio(vp.height / vp.width);
        setDoc(loaded);
      } catch (e) {
        console.error("[pdf]", e);
        if (!cancelled) setError("PDF faylni ochib bo‘lmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.");
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [file.id]);

  // Fit-to-width base size; zoom multiplies it.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(el.clientWidth - 24, 1000)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Resume where the reader stopped last time.
  useEffect(() => {
    if (!doc || !width) return;
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(storeKey)) || 1;
    } catch {}
    if (saved > 1 && saved <= doc.numPages) document.getElementById(`pdfp-${file.id}-${saved}`)?.scrollIntoView();
  }, [doc, width, file.id, storeKey]);

  // Current page = the page at the top of the view (pages share the first page's proportions).
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el || !doc) return;
    const step = Math.round(width * zoom * ratio) + 12;
    const n = Math.min(doc.numPages, Math.max(1, Math.floor((el.scrollTop + step / 3) / step) + 1));
    setPage(n);
    try {
      localStorage.setItem(storeKey, String(n));
    } catch {}
  }, [doc, width, zoom, ratio, storeKey]);

  // Back button (Android, swipe) closes the reader instead of leaving the page.
  useEffect(() => {
    history.pushState({ pdfReader: true }, "");
    const pop = () => onClose();
    window.addEventListener("popstate", pop);
    const key = (e: KeyboardEvent) => e.key === "Escape" && history.back();
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const pageW = Math.round(width * zoom);
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-surface-3" role="dialog" aria-modal="true" aria-label={file.name}>
      <div className="flex items-center gap-2 border-b border-border bg-surface px-2 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
        <Button variant="ghost" size="icon" onClick={() => history.back()} aria-label="Yopish">
          <X />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">{file.name}</div>
          <div className="text-[11.5px] text-muted tabular">{doc ? `${page} / ${doc.numPages} bet` : "Yuklanmoqda…"}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={zoom <= 1} aria-label="Kichiklashtirish">
          <Minus />
        </Button>
        <span className="w-10 text-center text-[12px] text-muted tabular">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} disabled={zoom >= 3} aria-label="Kattalashtirish">
          <Plus />
        </Button>
        <DownloadButton file={file} compact />
      </div>
      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-auto overscroll-contain pb-safe">
        {error ? (
          <div className="mx-auto max-w-sm p-8 text-center text-[14px] text-text-2">
            <p>{error}</p>
            <div className="mt-4 flex justify-center">
              <DownloadButton file={file} />
            </div>
          </div>
        ) : !doc || !width ? (
          <div className="grid h-full place-items-center text-muted">
            <Loader2 className="size-6 animate-spin" aria-label="Yuklanmoqda" />
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center gap-3 px-3 py-3" style={{ width: pageW + 24 }}>
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i + 1} id={`pdfp-${file.id}-${i + 1}`} doc={doc} n={i + 1} width={pageW} height={Math.round(pageW * ratio)} root={scroller} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** One page: rendered only while near the viewport, released when far away so long books stay light on memory. */
function PdfPage({ id, doc, n, width, height, root }: { id: string; doc: PDFDocumentProxy; n: number; width: number; height: number; root: React.RefObject<HTMLDivElement | null> }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [h, setH] = useState(height);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root: root.current, rootMargin: "150% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    if (!near) {
      c.width = 0;
      c.height = 0;
      return;
    }
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let stop = false;
    (async () => {
      const p = await doc.getPage(n);
      if (stop) return;
      const base = p.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = p.getViewport({ scale: (width / base.width) * dpr });
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      setH(Math.round(vp.height / dpr));
      task = p.render({ canvas: c, viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => {
      stop = true;
      task?.cancel();
    };
  }, [near, doc, n, width]);

  return (
    <div ref={box} id={id} className="relative shrink-0 overflow-hidden rounded-sm bg-white shadow-card" style={{ width, height: h }}>
      <canvas ref={canvas} className="block h-full w-full" aria-label={`${n}-bet`} />
      {!near ? <span className="absolute inset-0 grid place-items-center text-[12px] text-neutral-400">{n}</span> : null}
    </div>
  );
}

/** Same-tab download through fetch, so the session cookie is always sent (works inside the installed app too). */
export async function downloadFile(file: FileRef) {
  try {
    const res = await fetch(`/api/files/${file.id}?download=1`, { credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    toast.error("Faylni yuklab bo‘lmadi. Qayta urinib ko‘ring.");
  }
}

export function DownloadButton({ file, compact, className }: { file: FileRef; compact?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await downloadFile(file);
    setBusy(false);
  };
  return compact ? (
    <Button variant="ghost" size="icon" onClick={go} disabled={busy} aria-label="Yuklab olish">
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
    </Button>
  ) : (
    <button type="button" onClick={go} disabled={busy} className={cn(buttonClass("secondary", "lg"), className)}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />} Yuklab olish{file.size ? ` · ${fmtSize(file.size)}` : ""}
    </button>
  );
}

/** "Read the book" button + reader, for server-rendered pages. */
export function PdfOpenButton({ file, label = "Kitobni o‘qish", withDownload }: { file: FileRef; label?: string; withDownload?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary", "lg")}>
        <BookOpen /> {label}
      </button>
      {withDownload ? <DownloadButton file={file} /> : null}
      {open ? <PdfReader file={file} onClose={close} /> : null}
    </>
  );
}
