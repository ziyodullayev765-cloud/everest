"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Reply } from "lucide-react";
import { Select, Textarea, btnClass } from "./ui";
import type { ContactMessage } from "@/lib/types";

/** Ready-made answers; {name} becomes the sender's first name. */
export const REPLY_TEMPLATES: { id: string; label: string; body: string }[] = [
  {
    id: "thanks-uz",
    label: "UZ · Rahmat, tez orada javob beraman",
    body: "Assalomu alaykum, {name}!\n\nXabaringiz uchun rahmat. Uni o‘qib chiqdim va tez orada batafsil javob yozaman.\n\nHurmat bilan",
  },
  {
    id: "call-uz",
    label: "UZ · Keling, gaplashamiz",
    body: "Assalomu alaykum, {name}!\n\nTaklifingiz qiziq tuyuldi. Qachon gaplashsak qulay bo‘ladi? Menga qulay vaqtni yozib yuboring.\n\nHurmat bilan",
  },
  {
    id: "thanks-en",
    label: "EN · Thanks, I’ll get back to you",
    body: "Hi {name},\n\nThanks for reaching out! I’ve read your message and will get back to you with a proper answer soon.\n\nBest regards",
  },
  {
    id: "call-en",
    label: "EN · Let’s talk",
    body: "Hi {name},\n\nThis sounds interesting. When would be a good time for a short call? Send me a couple of times that work for you.\n\nBest regards",
  },
  {
    id: "decline-en",
    label: "EN · Not available right now",
    body: "Hi {name},\n\nThank you for thinking of me. Unfortunately I can’t take this on right now, but I’d be glad to stay in touch.\n\nBest regards",
  },
  {
    id: "thanks-ru",
    label: "RU · Спасибо, скоро отвечу",
    body: "Здравствуйте, {name}!\n\nСпасибо за сообщение. Я его прочитал и скоро отвечу подробнее.\n\nС уважением",
  },
];

export function QuickReply({ message, onReplied }: { message: ContactMessage; onReplied: () => void }) {
  const first = message.name.trim().split(/\s+/)[0] ?? "";
  const fill = (id: string) => (REPLY_TEMPLATES.find((t) => t.id === id)?.body ?? "").replaceAll("{name}", first);
  const [tpl, setTpl] = useState(REPLY_TEMPLATES[0]!.id);
  const [body, setBody] = useState(() => fill(REPLY_TEMPLATES[0]!.id));
  const subject = `Re: ${message.subject || "Your message"}`;
  const mailto = `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    `${body}\n\n---\n${message.message.slice(0, 1200).replace(/^/gm, "> ")}`,
  )}`;

  return (
    <div className="border-line mt-4 rounded-xl border p-3">
      <label className="text-subtle mb-1.5 block text-xs" htmlFor={`tpl-${message.id}`}>
        Quick reply
      </label>
      <Select
        id={`tpl-${message.id}`}
        value={tpl}
        onChange={(e) => {
          setTpl(e.target.value);
          setBody(fill(e.target.value));
        }}
      >
        {REPLY_TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </Select>
      <Textarea aria-label="Reply text" className="mt-2" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={mailto} className={btnClass("primary", "sm")} onClick={onReplied}>
          <Reply className="size-3.5" aria-hidden /> Open in email app
        </a>
        <button
          type="button"
          className={btnClass("secondary", "sm")}
          onClick={() =>
            navigator.clipboard.writeText(body).then(
              () => toast.success("Reply copied"),
              () => toast.error("Could not copy"),
            )
          }
        >
          <Copy className="size-3.5" aria-hidden /> Copy text
        </button>
      </div>
    </div>
  );
}
