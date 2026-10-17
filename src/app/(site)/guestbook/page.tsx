import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section-heading";
import { GuestbookForm } from "@/components/site/guestbook-form";
import { Reveal } from "@/components/ui/reveal";
import { getCopy } from "@/lib/i18n/server";
import { getGuestbook } from "@/lib/data/public";
import { fullDate } from "@/lib/i18n/dictionaries";
import { initials } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.guestbook.title, description: copy.guestbook.lead, alternates: { canonical: "/guestbook" } };
}

export default async function GuestbookPage() {
  const copy = await getCopy();
  const entries = await getGuestbook();
  return (
    <>
      <PageHeader eyebrow={copy.guestbook.eyebrow} title={copy.guestbook.title} lead={copy.guestbook.lead} />
      <div className="mx-auto grid w-[min(1200px,calc(100%-2rem))] gap-10 lg:grid-cols-[420px_1fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <GuestbookForm />
        </div>
        {entries.length === 0 ? (
          <p className="text-muted border-line rounded-3xl border border-dashed p-10 text-center">{copy.guestbook.empty}</p>
        ) : (
          <ul className="grid gap-4">
            {entries.map((e, i) => (
              <li key={e.id}>
                <Reveal delay={Math.min(i, 6) * 0.04} className="border-line bg-surface flex gap-4 rounded-2xl border p-5">
                  <span className="border-line grid size-10 shrink-0 place-items-center rounded-full border text-xs font-medium">
                    {initials(e.name) || "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-medium">{e.name}</span>
                      <time className="text-subtle text-xs" dateTime={e.created_at}>
                        {fullDate(e.created_at, copy)}
                      </time>
                    </p>
                    <p className="mt-1.5 break-words whitespace-pre-line text-[var(--fg-secondary)]">{e.message}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
