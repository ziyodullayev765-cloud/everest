import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { RichText } from "@/components/ui/rich-text";
import { getSettings } from "@/lib/data/public";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.uses.title, description: copy.uses.lead, alternates: { canonical: "/uses" } };
}

/** Tools & setup, written in Admin → Settings → Now & Uses. Hidden until filled in. */
export default async function UsesPage() {
  const [copy, settings] = await Promise.all([getCopy(), getSettings()]);
  if (!settings.uses_text?.trim()) notFound();
  return (
    <>
      <PageHeader eyebrow={copy.uses.eyebrow} title={copy.uses.title} lead={copy.uses.lead} />
      <Reveal className="uses-text mx-auto w-[min(820px,calc(100%-2rem))]">
        <RichText text={settings.uses_text} />
      </Reveal>
    </>
  );
}
