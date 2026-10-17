"use client";

import { useState } from "react";
import { Share2, UserPlus } from "lucide-react";
import { useCopy } from "@/components/i18n/provider";

export function CardActions({ url, name }: { url: string; name: string }) {
  const copy = useCopy();
  const [done, setDone] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) return void (await navigator.share({ title: name, url }));
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {}
  };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <a href="/card.vcf" className="ed-button ed-button--accent" data-track="Contact saved">
        <UserPlus className="size-4" aria-hidden />
        {copy.card.save}
      </a>
      <button type="button" onClick={share} className="ed-button">
        <Share2 className="size-4" aria-hidden />
        <span aria-live="polite">{done ? copy.card.copied : copy.card.share}</span>
      </button>
    </div>
  );
}
