import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import { PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { getResource } from "@/lib/cms/resources";
import { formatDateTime } from "@/lib/utils";

export default async function EditResource({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from(resource.table).select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <>
      <PageTitle
        title={String(data[resource.titleField] || `Edit ${resource.singular.toLowerCase()}`)}
        description={`Last updated ${formatDateTime(data.updated_at as string)}`}
      />
      <ContentForm key={data.updated_at as string} mode={{ type: "resource", key, id }} initial={data} />
    </>
  );
}
