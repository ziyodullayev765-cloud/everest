"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { trackEvent } from "@/lib/client/track";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { submitContact } from "@/app/(site)/contact/actions";
import { buttonClass } from "@/components/ui/button";
import { useCopy } from "@/components/i18n/provider";
import { makeContactSchema, type ContactInput } from "@/lib/validation/contact";
import { cn } from "@/lib/utils";

const input =
  "w-full rounded-2xl border border-line bg-white/[0.03] px-4 py-3.5 text-fg placeholder:text-subtle transition focus:border-accent/70 focus:bg-white/[0.05] focus:outline-none aria-[invalid=true]:border-red-400/70";

export function ContactForm() {
  const copy = useCopy();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const startedAt = useRef(Date.now());
  const honeypot = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(makeContactSchema(copy.contact.validation)),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  const onSubmit = (values: ContactInput) => {
    setStatus(null);
    startTransition(async () => {
      const res = await submitContact({ ...values, website: honeypot.current?.value ?? "", startedAt: startedAt.current });
      if (res.ok) {
        trackEvent("Contact message sent");
        setStatus({ type: "success", text: res.message ?? copy.contact.success });
        reset();
        startedAt.current = Date.now();
      } else {
        for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) {
          if (field in values) setError(field as keyof ContactInput, { message: msgs[0] });
        }
        setStatus({ type: "error", text: res.error });
      }
    });
  };

  const field = (name: keyof ContactInput) => ({
    id: `contact-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `contact-${name}-error` : undefined,
  });

  const err = (name: keyof ContactInput) =>
    errors[name] ? (
      <p id={`contact-${name}-error`} className="mt-1.5 text-sm text-red-300">
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-busy={pending}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-muted mb-2 block text-sm">
            {copy.contact.name}
          </label>
          <input {...register("name")} {...field("name")} autoComplete="name" className={input} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="contact-email" className="text-muted mb-2 block text-sm">
            {copy.contact.email}
          </label>
          <input
            {...register("email")}
            {...field("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            className={input}
          />
          {err("email")}
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="text-muted mb-2 block text-sm">
          {copy.contact.subject}
        </label>
        <input {...register("subject")} {...field("subject")} className={input} />
        {err("subject")}
      </div>
      <div>
        <label htmlFor="contact-message" className="text-muted mb-2 block text-sm">
          {copy.contact.message}
        </label>
        <textarea {...register("message")} {...field("message")} rows={6} className={cn(input, "resize-y")} />
        {err("message")}
      </div>

      {/* Honeypot — hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input ref={honeypot} id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-subtle text-xs">
          <Link href="/privacy" className="hover:text-fg underline underline-offset-4">
            {copy.contact.privacyNote}
          </Link>
        </p>
        <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "sm:min-w-44")}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          {pending ? copy.contact.sending : copy.contact.send}
        </button>
      </div>

      <div aria-live="polite" role="status">
        <AnimatePresence>
          {status && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm",
                status.type === "success"
                  ? "border-accent/40 bg-accent/10 text-fg"
                  : "border-red-400/40 bg-red-500/10 text-red-100",
              )}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden />
              )}
              {status.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
