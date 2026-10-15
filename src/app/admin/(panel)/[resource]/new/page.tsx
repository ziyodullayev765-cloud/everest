import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import { PageTitle } from "@/components/admin/ui";
import { getResource } from "@/lib/cms/resources";

export default async function NewResource({ params }: { params: Promise<{ resource: string }> }) {
  const { resource: key } = await params;
  const resource = getResource(key);
  if (!resource) notFound();
  return (
    <>
      <PageTitle
        title={`New ${resource.singular.toLowerCase()}`}
        description="New items start as drafts and stay hidden until you publish them."
      />
      <ContentForm mode={{ type: "resource", key, id: null }} initial={null} />
    </>
  );
}
