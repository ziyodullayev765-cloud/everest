"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FileText, Loader2, Search } from "lucide-react";
import { listMedia } from "@/app/admin/actions/media";
import { Dropzone } from "./dropzone";
import { Button, Input, Modal } from "./ui";
import type { Media } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

/** Pick one (or several) files from the media library, or upload new ones in place. */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  kind,
  multiple = false,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: Media[]) => void;
  kind?: "image" | "document" | "audio";
  multiple?: boolean;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [items, setItems] = useState<Media[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setItems(null);
    setError(null);
    listMedia(kind).then((res) => (res.ok ? setItems(res.data ?? []) : setError(res.error)));
  }, [open, kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((m) => !q || `${m.file_name} ${m.alt_text} ${m.caption} ${m.category}`.toLowerCase().includes(q));
  }, [items, query]);

  const toggle = (id: string) =>
    setSelected((s) => (multiple ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));

  const confirm = (list = selected) => {
    const chosen = list.map((id) => items?.find((m) => m.id === id)).filter(Boolean) as Media[];
    if (chosen.length) onSelect(chosen);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        kind === "document"
          ? "Choose a document"
          : kind === "image"
            ? "Choose an image"
            : kind === "audio"
              ? "Choose audio"
              : "Choose a file"
      }
      wide
    >
      <div className="border-line mb-4 flex gap-1 rounded-xl border p-1 text-sm" role="tablist">
        {(["library", "upload"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 capitalize transition",
              tab === t ? "text-fg bg-white/10" : "text-muted hover:text-fg",
            )}
          >
            {t === "library" ? "Media library" : "Upload new"}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <Dropzone
          accept={kind ?? "any"}
          multiple={multiple}
          onUploaded={(m) => {
            setItems((list) => [m, ...(list ?? [])]);
            if (!multiple) {
              onSelect([m]);
              onClose();
            } else {
              setSelected((s) => [...s, m.id]);
            }
          }}
        />
      ) : (
        <>
          <label className="relative mb-4 block">
            <span className="sr-only">Search media</span>
            <Search className="text-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, alt text, caption…"
              className="pl-9"
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {!items && !error && (
            <p className="text-muted flex items-center gap-2 py-10 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Loading library…
            </p>
          )}
          {items && filtered.length === 0 && (
            <p className="text-muted py-10 text-center text-sm">No files yet — switch to “Upload new”.</p>
          )}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {filtered.map((m) => {
              const isSel = selected.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => toggle(m.id)}
                    onDoubleClick={() => !multiple && confirm([m.id])}
                    aria-pressed={isSel}
                    className={cn(
                      "group relative block w-full overflow-hidden rounded-xl border text-left transition",
                      isSel ? "border-accent ring-accent/40 ring-2" : "border-line hover:border-line-strong",
                    )}
                  >
                    <div className="relative aspect-square bg-white/[0.03]">
                      {m.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt={m.alt_text} className="absolute inset-0 size-full object-cover" loading="lazy" />
                      ) : (
                        <FileText className="text-subtle absolute inset-0 m-auto size-10" aria-hidden />
                      )}
                      {isSel && (
                        <span className="bg-accent absolute top-2 right-2 grid size-6 place-items-center rounded-full text-black">
                          <Check className="size-4" aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="truncate text-xs font-medium">{m.file_name}</p>
                      <p className="text-subtle text-[0.7rem]">{formatBytes(m.size_bytes)}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="border-line bg-bg-elevated sticky bottom-0 mt-5 flex justify-end gap-2 border-t pt-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!selected.length} onClick={() => confirm()}>
          {multiple ? `Add ${selected.length || ""} selected` : "Use selected"}
        </Button>
      </div>
    </Modal>
  );
}
