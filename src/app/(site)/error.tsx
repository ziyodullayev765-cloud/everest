"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { useCopy } from "@/components/i18n/provider";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = useCopy();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container-x flex min-h-[70svh] flex-col items-center justify-center pt-24 text-center" role="alert">
      <h1 className="text-3xl font-semibold tracking-tight">{copy.error.title}</h1>
      <p className="text-muted mt-3 max-w-md">{copy.error.lead}</p>
      <button type="button" onClick={reset} className={buttonClass("primary", "lg", "mt-8")}>
        <RotateCcw className="size-4" aria-hidden />
        {copy.error.retry}
      </button>
    </section>
  );
}
