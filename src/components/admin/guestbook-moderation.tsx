"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { deleteGuestbookEntry, setGuestbookApproved } from "@/app/admin/actions/guestbook";
import { EmptyBlock, btnClass } from "./ui";
import { cn, formatDateTime } from "@/lib/utils";

export interface AdminGuestbookEntry {
  id: string;
  name: string;
  message: string;
  approved: boolean;
  created_at: string;
}

export function GuestbookModeration({ initial }: { initial: AdminGuestbookEntry[] }) {
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();

  const approve = (e: AdminGuestbookEntry, approved: boolean) =>
    start(async () => {
      const res = await setGuestbookApproved(e.id, approved);
      if (!res.ok) return void toast.error(res.error);
      setItems((xs) => xs.map((x) => (x.id === e.id ? { ...x, approved } : x)));
      toast.success(res.message);
    });
  const remove = (e: AdminGuestbookEntry) =>
    start(async () => {
      const res = await deleteGuestbookEntry(e.id);
      if (!res.ok) return void toast.error(res.error);
      setItems((xs) => xs.filter((x) => x.id !== e.id));
      toast.success(res.message);
    });

  if (!items.length) return <EmptyBlock title="No notes yet">Visitors can sign the guestbook at /guestbook.</EmptyBlock>;
  return (
    <ul className="grid gap-3">
      {items.map((e) => (
        <li
          key={e.id}
          className={cn("border-line rounded-2xl border p-4", !e.approved && "border-amber-300/30 bg-amber-300/[0.03]")}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              {e.name}{" "}
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs",
                  e.approved ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-300/10 text-amber-200",
                )}
              >
                {e.approved ? "Visible" : "Waiting for review"}
              </span>
            </p>
            <time className="text-subtle text-xs" dateTime={e.created_at}>
              {formatDateTime(e.created_at)}
            </time>
          </div>
          <p className="text-fg/90 mt-2 text-sm break-words whitespace-pre-line">{e.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {e.approved ? (
              <button type="button" className={btnClass("secondary", "sm")} disabled={pending} onClick={() => approve(e, false)}>
                <EyeOff className="size-3.5" aria-hidden /> Hide
              </button>
            ) : (
              <button type="button" className={btnClass("primary", "sm")} disabled={pending} onClick={() => approve(e, true)}>
                <Check className="size-3.5" aria-hidden /> Approve
              </button>
            )}
            <button
              type="button"
              className={btnClass("ghost", "sm", "text-red-300")}
              disabled={pending}
              onClick={() => remove(e)}
              aria-label={`Delete note from ${e.name}`}
            >
              <Trash2 className="size-3.5" aria-hidden /> Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
