"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, FileText, Images, RefreshCw, Search, Trash2, Music } from "lucide-react";
import { deleteMedia, getMediaUsage, updateMediaMeta } from "@/app/admin/actions/media";
import { Dropzone } from "./dropzone";
import { Button, ConfirmDialog, EmptyBlock, Input, Modal, Select, StatusBadge, Switch, Textarea } from "./ui";
import { uploadReplacement } from "@/lib/upload-client";
import type { Media } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/utils";

function Editor({ media, onSaved, onDeleted }: { media: Media; onSaved: (m: Media) => void; onDeleted: (id: string) => void }) {
  const [alt, setAlt] = useState(media.alt_text);
  const [caption, setCaption] = useState(media.caption);
  const [category, setCategory] = useState(media.category);
  const [inGallery, setInGallery] = useState(media.in_gallery);
  const [status, setStatus] = useState(media.status);
  const [saving, startSave] = useTransition();
  const [usage, setUsage] = useState<string[] | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState<number | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const save = () =>
    startSave(async () => {
      const values = { alt_text: alt, caption, category, in_gallery: inGallery, status };
      const res = await updateMediaMeta(media.id, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved.");
      onSaved({ ...media, ...values });
    });

  const askDelete = async () => {
    const res = await getMediaUsage(media.id);
    setUsage(res.ok ? (res.data ?? []) : []);
    setConfirm(true);
  };

  const doDelete = async () => {
    setDeleting(true);
    const res = await deleteMedia(media.id, true);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message);
    setConfirm(false);
    onDeleted(media.id);
  };

  const replace = async (file: File) => {
    setReplacing(0);
    try {
      const updated = await uploadReplacement(media.id, file, media.kind, (p) => setReplacing(p));
      toast.success("File replaced everywhere it was used.");
      onSaved(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed.");
    } finally {
      setReplacing(null);
    }
  };

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="border-line relative grid aspect-square place-items-center overflow-hidden rounded-xl border bg-white/[0.03]">
          {media.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={alt} className="absolute inset-0 size-full object-contain" />
          ) : media.kind === "audio" ? (
            <div className="grid w-full gap-3 p-4">
              <Music className="text-subtle mx-auto size-12" aria-hidden />
              <audio controls src={media.url} className="w-full" preload="none" />
            </div>
          ) : (
            <FileText className="text-subtle size-14" aria-hidden />
          )}
        </div>
        <dl className="text-muted mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-subtle">File</dt>
          <dd className="truncate" title={media.file_name}>
            {media.file_name}
          </dd>
          <dt className="text-subtle">Type</dt>
          <dd>{media.mime_type}</dd>
          <dt className="text-subtle">Size</dt>
          <dd>{formatBytes(media.size_bytes)}</dd>
          {media.width && (
            <>
              <dt className="text-subtle">Dimensions</dt>
              <dd>
                {media.width}×{media.height}
              </dd>
            </>
          )}
          <dt className="text-subtle">Uploaded</dt>
          <dd>{formatDateTime(media.created_at)}</dd>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigator.clipboard.writeText(media.url).then(() => toast.success("URL copied."))}>
            <Copy className="size-3.5" aria-hidden /> Copy URL
          </Button>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-xs hover:bg-white/[0.06]"
          >
            <ExternalLink className="size-3.5" aria-hidden /> Open
          </a>
          <Button size="sm" onClick={() => replaceInput.current?.click()} loading={replacing !== null}>
            {replacing === null && <RefreshCw className="size-3.5" aria-hidden />}
            {replacing !== null ? `${Math.round(replacing * 100)}%` : "Replace file"}
          </Button>
          <input
            ref={replaceInput}
            type="file"
            className="sr-only"
            accept={media.kind === "image" ? "image/*" : media.kind === "audio" ? "audio/*" : "application/pdf"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void replace(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="grid content-start gap-4">
        <div>
          <label htmlFor="m-alt" className="mb-1.5 block text-sm font-medium">
            Alt text
          </label>
          <Input
            id="m-alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={300}
            placeholder="Describe the image for screen readers"
          />
        </div>
        <div>
          <label htmlFor="m-caption" className="mb-1.5 block text-sm font-medium">
            Caption
          </label>
          <Textarea id="m-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={600} rows={3} />
        </div>
        <div>
          <label htmlFor="m-cat" className="mb-1.5 block text-sm font-medium">
            Category
          </label>
          <Input
            id="m-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={80}
            placeholder="e.g. Design, Events, Certificates"
          />
        </div>
        {media.kind === "image" && (
          <div className="border-line rounded-xl border p-3">
            <Switch id="m-gallery" checked={inGallery} onChange={setInGallery} label="Show in public gallery" />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-muted">Gallery status:</span>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as Media["status"])}
                className="h-9 w-auto py-1"
                aria-label="Gallery status"
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
              </Select>
            </div>
          </div>
        )}
        <div className="flex justify-between gap-2 pt-2">
          <Button variant="danger" onClick={askDelete}>
            <Trash2 className="size-4" aria-hidden /> Delete
          </Button>
          <Button variant="primary" onClick={save} loading={saving}>
            Save details
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doDelete}
        loading={deleting}
        title="Delete this file?"
        message={
          usage && usage.length ? (
            <>
              <p className="text-amber-200">This file is currently used in: {usage.join(", ")}.</p>
              <p className="mt-2">Deleting it will remove it from those places too, and permanently delete it from storage.</p>
            </>
          ) : (
            "The file is not used anywhere. It will be permanently deleted from storage."
          )
        }
      />
    </div>
  );
}

export function MediaLibrary({ initial }: { initial: Media[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [onlyGallery, setOnlyGallery] = useState(false);
  const [active, setActive] = useState<Media | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (m) =>
        (!kind || m.kind === kind) &&
        (!onlyGallery || m.in_gallery) &&
        (!q || `${m.file_name} ${m.alt_text} ${m.caption} ${m.category}`.toLowerCase().includes(q)),
    );
  }, [items, query, kind, onlyGallery]);

  const totalBytes = items.reduce((s, m) => s + m.size_bytes, 0);

  return (
    <div className="grid gap-6">
      <Dropzone
        galleryOption
        onUploaded={(m) => {
          setItems((list) => [m, ...list]);
          router.refresh();
        }}
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <label className="relative">
          <span className="sr-only">Search media</span>
          <Search className="text-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="pl-9" />
        </label>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="File type">
          <option value="">All files</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
          <option value="audio">Audio</option>
        </Select>
        <Switch id="only-gallery" checked={onlyGallery} onChange={setOnlyGallery} label="Gallery only" />
      </div>
      <p className="text-subtle -mt-3 text-xs">
        {items.length} files · {formatBytes(totalBytes)}
      </p>

      {items.length === 0 ? (
        <EmptyBlock title="Your media library is empty">Upload photos, certificates or your CV above.</EmptyBlock>
      ) : visible.length === 0 ? (
        <EmptyBlock title="No files match" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setActive(m)}
                className="group border-line hover:border-line-strong block w-full overflow-hidden rounded-xl border bg-white/[0.02] text-left transition"
              >
                <div className="relative aspect-[4/3] bg-white/[0.03]">
                  {m.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt={m.alt_text}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <FileText className="text-subtle absolute inset-0 m-auto size-10" aria-hidden />
                  )}
                  {m.in_gallery && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] backdrop-blur">
                      <Images className="size-3" aria-hidden /> Gallery
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium">{m.file_name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-subtle text-[0.7rem]">{formatBytes(m.size_bytes)}</span>
                    {m.in_gallery && <StatusBadge status={m.status} />}
                  </div>
                  {!m.alt_text && m.kind === "image" && <p className="mt-1 text-[0.68rem] text-amber-200">Missing alt text</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title="Media details" wide>
        {active && (
          <Editor
            key={active.id + active.url}
            media={active}
            onSaved={(m) => {
              setItems((list) => list.map((x) => (x.id === m.id ? m : x)));
              setActive(m);
            }}
            onDeleted={(id) => {
              setItems((list) => list.filter((x) => x.id !== id));
              setActive(null);
              router.refresh();
            }}
          />
        )}
      </Modal>
      <span className="sr-only" aria-live="polite">
        {visible.length} files shown
      </span>
    </div>
  );
}
