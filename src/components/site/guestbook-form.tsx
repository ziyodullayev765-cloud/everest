"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, PenLine } from "lucide-react";
import { signGuestbook } from "@/app/(site)/guestbook/actions";
import { useCopy } from "@/components/i18n/provider";
import { trackEvent } from "@/lib/client/track";
import { cn } from "@/lib/utils";

const input =
  "w-full rounded-2xl border border-line bg-white/[0.03] px-4 py-3.5 text-fg placeholder:text-subtle transition focus:border-accent/70 focus:outline-none";

export function GuestbookForm() {
  const copy = useCopy();
  const g = copy.guestbook;
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const startedAt = useRef(Date.now());
  const honeypot = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setStatus({ ok: false, text: g.nameError });
    if (message.trim().length < 2 || message.trim().length > 280) return setStatus({ ok: false, text: g.messageError });
    start(async () => {
      const res = await signGuestbook({ name, message, website: honeypot.current?.value ?? "", startedAt: startedAt.current });
      if (res.ok) {
        trackEvent("Guestbook signed");
        setName("");
        setMessage("");
        startedAt.current = Date.now();
        setStatus({ ok: true, text: res.message ?? g.thanks });
      } else setStatus({ ok: false, text: res.error });
    });
  };

  return (
    <form onSubmit={submit} className="glass grid gap-4 rounded-3xl p-6 sm:p-8" noValidate>
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          Website <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-medium">{g.name}</span>
        <input
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          required
        />
      </label>
      <label className="grid gap-2">
        <span className="flex items-baseline justify-between text-sm font-medium">
          {g.message}
          <span className={cn("text-subtle text-xs tabular-nums", message.length > 280 && "text-red-400")}>
            {message.length}/280
          </span>
        </span>
        <textarea
          className={cn(input, "min-h-28 resize-y")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          required
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="ed-button ed-button--accent">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PenLine className="size-4" aria-hidden />}
          {g.send}
        </button>
        {status && (
          <p role={status.ok ? "status" : "alert"} className={cn("text-sm", status.ok ? "text-emerald-400" : "text-red-400")}>
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
