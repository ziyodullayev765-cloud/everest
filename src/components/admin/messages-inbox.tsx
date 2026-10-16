"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Mail, MailOpen, Search, Trash2 } from "lucide-react";
import { deleteMessage, setMessageStatus } from "@/app/admin/actions/messages";
import { QuickReply } from "./quick-reply";
import { ConfirmDialog, EmptyBlock, Input, Select, btnClass } from "./ui";
import type { ContactMessage, MessageStatus } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export function MessagesInbox({ initial }: { initial: ContactMessage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"" | MessageStatus>("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ContactMessage | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (m) =>
        (filter ? m.status === filter : m.status !== "archived") &&
        (!q || `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q)),
    );
  }, [items, filter, query]);

  const setStatus = (m: ContactMessage, status: MessageStatus, silent = false) => {
    setItems((list) => list.map((x) => (x.id === m.id ? { ...x, status } : x)));
    startTransition(async () => {
      const res = await setMessageStatus(m.id, status);
      if (!res.ok) {
        toast.error(res.error);
        setItems((list) => list.map((x) => (x.id === m.id ? { ...x, status: m.status } : x)));
      } else {
        if (!silent)
          toast.success(status === "archived" ? "Archived." : status === "new" ? "Marked as unread." : "Marked as read.");
        router.refresh();
      }
    });
  };

  const open = (m: ContactMessage) => {
    setOpenId(openId === m.id ? null : m.id);
    if (m.status === "new") setStatus(m, "read", true);
  };

  return (
    <div>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <span className="sr-only">Search messages</span>
          <Search className="text-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages…" className="pl-9" />
        </label>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as "" | MessageStatus)} aria-label="Filter messages">
          <option value="">Inbox (new + read)</option>
          <option value="new">Unread</option>
          <option value="read">Read</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyBlock title={items.length ? "No messages here" : "No messages yet"}>
          Messages sent through the contact form appear here.
        </EmptyBlock>
      ) : (
        <ul className="divide-line border-line divide-y overflow-hidden rounded-2xl border">
          {visible.map((m) => {
            const expanded = openId === m.id;
            return (
              <li key={m.id} className={cn("bg-white/[0.015]", m.status === "new" && "bg-accent/[0.04]")}>
                <button
                  type="button"
                  onClick={() => open(m)}
                  aria-expanded={expanded}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03]"
                >
                  {m.status === "new" ? (
                    <Mail className="text-accent mt-0.5 size-4 shrink-0" aria-label="Unread" />
                  ) : (
                    <MailOpen className="text-subtle mt-0.5 size-4 shrink-0" aria-label="Read" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className={cn("truncate", m.status === "new" ? "font-semibold" : "text-fg/90 font-medium")}>
                        {m.name} <span className="text-subtle font-normal">&lt;{m.email}&gt;</span>
                      </p>
                      <time className="text-subtle text-xs" dateTime={m.created_at}>
                        {formatDateTime(m.created_at)}
                      </time>
                    </div>
                    <p className="text-muted mt-0.5 line-clamp-1 text-sm">
                      {m.subject && <span className="text-fg/80">{m.subject} — </span>}
                      {m.message}
                    </p>
                  </div>
                </button>
                {expanded && (
                  <div className="border-line border-t px-4 pt-3 pb-4 sm:pl-11">
                    <p className="text-fg/90 text-sm leading-relaxed break-words whitespace-pre-wrap">{m.message}</p>
                    <QuickReply message={m} onReplied={() => m.status === "new" && setStatus(m, "read", true)} />
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.status !== "new" && (
                        <button
                          type="button"
                          className={btnClass("secondary", "sm")}
                          onClick={() => setStatus(m, "new")}
                          disabled={pending}
                        >
                          <Mail className="size-3.5" aria-hidden /> Mark unread
                        </button>
                      )}
                      {m.status === "archived" ? (
                        <button
                          type="button"
                          className={btnClass("secondary", "sm")}
                          onClick={() => setStatus(m, "read")}
                          disabled={pending}
                        >
                          <ArchiveRestore className="size-3.5" aria-hidden /> Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={btnClass("secondary", "sm")}
                          onClick={() => setStatus(m, "archived")}
                          disabled={pending}
                        >
                          <Archive className="size-3.5" aria-hidden /> Archive
                        </button>
                      )}
                      <button type="button" className={btnClass("danger", "sm")} onClick={() => setToDelete(m)}>
                        <Trash2 className="size-3.5" aria-hidden /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={pending}
        title="Delete this message?"
        message="The message will be permanently deleted."
        onConfirm={() =>
          startTransition(async () => {
            if (!toDelete) return;
            const res = await deleteMessage(toDelete.id);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            setItems((list) => list.filter((x) => x.id !== toDelete.id));
            setToDelete(null);
            toast.success(res.message);
            router.refresh();
          })
        }
      />
    </div>
  );
}
