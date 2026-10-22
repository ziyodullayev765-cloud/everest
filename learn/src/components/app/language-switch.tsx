"use client";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/app/actions/student";
import { currentLocale, tr } from "@/lib/i18n/tr";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "uz", get label() { return tr("O‘zbekcha"); } },
  { value: "en", get label() { return tr("English"); } },
] as const;

/** O‘zbek / English. Reloads so every screen (server and client) renders in the new language. */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const cur = currentLocale();
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "flex-wrap")} role="radiogroup" aria-label={tr("Til")}>
      {!compact ? <Languages className="size-4 text-muted" aria-hidden /> : null}
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={cur === o.value}
          disabled={pending}
          onClick={() =>
            cur !== o.value &&
            start(async () => {
              await setLocaleAction(o.value);
              location.reload();
            })
          }
          className={cn(
            "rounded-full border-2 px-3.5 py-1.5 text-[13px] font-extrabold transition",
            cur === o.value ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-2 hover:bg-surface-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
