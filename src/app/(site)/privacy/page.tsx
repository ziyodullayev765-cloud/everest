import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { RichText } from "@/components/ui/rich-text";
import { getCopy } from "@/lib/i18n/server";
import { getSettings } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.privacy.title, alternates: { canonical: "/privacy" } };
}

export default async function PrivacyPage() {
  const copy = await getCopy();
  const settings = await getSettings();
  return (
    <>
      <PageHeader title={copy.privacy.title} />
      <section className="container-x max-w-3xl">
        {settings.privacy_policy ? <RichText text={settings.privacy_policy} /> : <EmptyState>{copy.privacy.empty}</EmptyState>}
      </section>
    </>
  );
}
