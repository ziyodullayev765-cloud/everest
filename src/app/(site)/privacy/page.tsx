import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { RichText } from "@/components/ui/rich-text";
import { copy } from "@/lib/copy";
import { getSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: copy.privacy.title, alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
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
