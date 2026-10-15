"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteResource, reorderResource, setResourceStatus } from "@/app/admin/actions/content";
import { ConfirmDialog, EmptyBlock, Input, Select, StatusBadge, btnClass } from "./ui";
import { getResource, type ListColumn } from "@/lib/cms/resources";
import { cn, formatDateTime, unique } from "@/lib/utils";

type Row = Record<string, unknown> & { id: string; status: string; sort_order: number; updated_at: string };
type SortKey = "manual" | "updated" | "title";

function Cell({ row, col }: { row: Row; col: ListColumn }) {
  const v = row[col.name];
  if (v === null || v === undefined || v === "") return <span className="text-subtle">—</span>;
  switch (col.kind) {
    case "boolean":
      return v ? <span className="text-accent">Yes</span> : <span className="text-subtle">No</span>;
    case "date":
      return <span className="tabular-nums">{String(v).length > 10 ? formatDateTime(String(v)) : String(v)}</span>;
    case "level":
      return <span className="tabular-nums">{String(v)}</span>;
    default:
      return <span className="line-clamp-1 break-all">{Array.isArray(v) ? v.join(", ") : String(v)}</span>;
  }
}

export function ResourceList({ resourceKey, rows: initialRows }: { resourceKey: string; rows: Row[] }) {
  const resource = getResource(resourceKey)!;
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [facet, setFacet] = useState("");
  const [sort, setSort] = useState<SortKey>("manual");
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [pending, startTransition] = useTransition();

  const facetValues = useMemo(
    () => (resource.facet ? unique(rows.map((r) => String(r[resource.facet!.name] ?? "")).filter(Boolean)).sort() : []),
    [rows, resource.facet],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (facet && resource.facet && r[resource.facet.name] !== facet) return false;
      if (!q) return true;
      return resource.searchFields
        .map((f) => r[f])
        .flat()
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    if (sort === "updated") return [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sort === "title")
      return [...list].sort((a, b) => String(a[resource.titleField] ?? "").localeCompare(String(b[resource.titleField] ?? "")));
    return [...list].sort((a, b) => a.sort_order - b.sort_order);
  }, [rows, query, status, facet, sort, resource]);

  const canReorder = sort === "manual" && !query && !status && !facet;

  const move = (index: number, dir: -1 | 1) => {
    const ordered = [...visible];
    const j = index + dir;
    if (j < 0 || j >= ordered.length) return;
    [ordered[index], ordered[j]] = [ordered[j]!, ordered[index]!];
    const next = ordered.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 }));
    setRows(next);
    startTransition(async () => {
      const res = await reorderResource(
        resourceKey,
        next.map((r) => r.id),
      );
      if (!res.ok) {
        toast.error(res.error);
        setRows(initialRows);
      }
    });
  };

  const toggleStatus = (row: Row) => {
    const nextStatus = row.status === "published" ? "draft" : "published";
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)));
    startTransition(async () => {
      const res = await setResourceStatus(resourceKey, row.id, nextStatus);
      if (!res.ok) {
        toast.error(res.error);
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      } else toast.success(res.message);
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const row = toDelete;
    startTransition(async () => {
      const res = await deleteResource(resourceKey, row.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      setToDelete(null);
      toast.success(res.message);
      router.refresh();
    });
  };

  const title = (r: Row) => String(r[resource.titleField] || r[resource.subtitleField ?? ""] || "Untitled");

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search {resource.label.toLowerCase()}</span>
          <Search className="text-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${resource.label.toLowerCase()}…`}
            className="pl-9"
          />
        </label>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </Select>
        {resource.facet && facetValues.length > 0 ? (
          <Select value={facet} onChange={(e) => setFacet(e.target.value)} aria-label={`Filter by ${resource.facet.label}`}>
            <option value="">All {resource.facet.label.toLowerCase()}s</option>
            {facetValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
          <option value="manual">Display order</option>
          <option value="updated">Recently updated</option>
          <option value="title">A → Z</option>
        </Select>
      </div>

      {!canReorder && rows.length > 1 && (
        <p className="text-subtle mb-3 text-xs">Clear search/filters and choose “Display order” to reorder items.</p>
      )}

      {rows.length === 0 ? (
        <EmptyBlock title={`No ${resource.label.toLowerCase()} yet`}>
          <Link href={`/admin/${resourceKey}/new`} className={btnClass("primary", "md", "mt-4")}>
            <Plus className="size-4" aria-hidden /> Add {resource.singular.toLowerCase()}
          </Link>
        </EmptyBlock>
      ) : visible.length === 0 ? (
        <EmptyBlock title="Nothing matches these filters" />
      ) : (
        <ul className={cn("divide-line border-line divide-y overflow-hidden rounded-2xl border", pending && "opacity-80")}>
          {visible.map((r, i) => {
            const img = resource.imageField ? (r[resource.imageField] as string | null) : null;
            const preview = resource.publicPath?.(r);
            return (
              <li key={r.id} className="flex flex-col gap-3 bg-white/[0.015] p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {resource.imageField && (
                    <div className="border-line grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white/[0.03]">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                      ) : (
                        <ImageIcon className="text-subtle size-4" aria-hidden />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link href={`/admin/${resourceKey}/${r.id}`} className="hover:text-accent line-clamp-1 font-medium">
                      {title(r)}
                    </Link>
                    <div className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <StatusBadge status={r.status} />
                      {resource.columns.map((c) => (
                        <span key={c.name} className="inline-flex max-w-56 items-center gap-1">
                          <span className="text-subtle">{c.label}:</span> <Cell row={r} col={c} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  {canReorder && (
                    <>
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || pending}
                        className={btnClass("ghost", "sm", "px-2")}
                        aria-label={`Move ${title(r)} up`}
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === visible.length - 1 || pending}
                        className={btnClass("ghost", "sm", "px-2")}
                        aria-label={`Move ${title(r)} down`}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleStatus(r)}
                    disabled={pending}
                    className={btnClass("ghost", "sm")}
                    title={r.status === "published" ? "Unpublish (move to drafts)" : "Publish"}
                  >
                    {r.status === "published" ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                    <span className="hidden md:inline">{r.status === "published" ? "Unpublish" : "Publish"}</span>
                  </button>
                  {preview && (
                    <a
                      href={`/api/preview?path=${encodeURIComponent(preview)}`}
                      target="_blank"
                      rel="noopener"
                      className={btnClass("ghost", "sm", "px-2")}
                      aria-label={`Preview ${title(r)}`}
                      title="Preview"
                    >
                      <Eye className="text-accent size-4" aria-hidden />
                    </a>
                  )}
                  <Link
                    href={`/admin/${resourceKey}/${r.id}`}
                    className={btnClass("ghost", "sm", "px-2")}
                    aria-label={`Edit ${title(r)}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setToDelete(r)}
                    className={btnClass("ghost", "sm", "px-2 text-red-300")}
                    aria-label={`Delete ${title(r)}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={pending}
        title={`Delete “${toDelete ? title(toDelete) : ""}”?`}
        message="This permanently removes it from the website and the database. This cannot be undone."
      />
    </div>
  );
}
