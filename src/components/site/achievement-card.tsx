import { Award, ExternalLink, FileText, Flag, Medal, Sparkles, Trophy } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { RichText } from "@/components/ui/rich-text";
import { useCopy } from "@/components/i18n/provider";
import type { Achievement } from "@/lib/types";
import { fullDate } from "@/lib/i18n/dictionaries";

const KIND_ICON = { award: Trophy, competition: Medal, certificate: Award, milestone: Flag, other: Sparkles } as const;

export function KindIcon({ kind, className }: { kind: Achievement["kind"]; className?: string }) {
  const Icon = KIND_ICON[kind] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

export function AchievementCard({ a, compact = false }: { a: Achievement; compact?: boolean }) {
  const copy = useCopy();
  return (
    <article className="glass group hover:border-line-strong relative overflow-hidden rounded-3xl p-6 transition-colors duration-500 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="bg-accent/12 text-accent ring-accent/25 grid size-11 shrink-0 place-items-center rounded-2xl ring-1">
          <KindIcon kind={a.kind} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-subtle flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-accent/90 font-mono tracking-[0.16em] uppercase">
              {copy.achievements.kinds[a.kind] ?? a.kind}
            </span>
            {a.achieved_on && (
              <>
                <span aria-hidden>·</span>
                <time dateTime={a.achieved_on}>{fullDate(a.achieved_on, copy)}</time>
              </>
            )}
          </p>
          <h3 className="mt-1.5 text-lg leading-snug font-semibold tracking-tight">{a.title}</h3>
          {a.organization && <p className="text-muted mt-1 text-sm">{a.organization}</p>}
        </div>
      </div>

      {!compact && (
        <>
          {a.image_url && (
            <div className="border-line relative mt-5 aspect-[16/9] overflow-hidden rounded-2xl border">
              <SmartImage
                src={a.image_url}
                alt={a.image_alt || a.title}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
            </div>
          )}
          {a.description && <RichText text={a.description} className="mt-5 text-[0.95rem]" />}
          {(a.certificate_url || a.credential_url) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {a.certificate_url && (
                <a
                  href={a.certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-line text-fg hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition"
                >
                  <FileText className="size-4" aria-hidden />
                  {copy.achievements.certificate}
                </a>
              )}
              {a.credential_url && (
                <a
                  href={a.credential_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-line text-fg hover:border-accent hover:text-accent inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition"
                >
                  <ExternalLink className="size-4" aria-hidden />
                  {copy.achievements.verify}
                </a>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
