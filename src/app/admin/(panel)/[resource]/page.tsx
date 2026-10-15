import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { ResourceList } from "@/components/admin/resource-list";
import { PageTitle } from "@/components/admin/ui";
import { btnClass } from "@/components/admin/styles";
import { requireAdminPage } from "@/lib/auth";
import { getResource } from "@/lib/cms/resources";

export default async function ResourceIndex({ params }: { params: Promise<{ resource: string }> }) {
  const { resource: key } = await params;
  const resource = getResource(key);
  if (!resource) notFound();
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from(resource.table).select("*").order("sort_order").limit(1000);

  return (
    <>
      <PageTitle
        title={resource.label}
        description={resource.description}
        actions={
          <Link href={`/admin/${key}/new`} className={btnClass("primary")}>
            <Plus className="size-4" aria-hidden /> New {resource.singular.toLowerCase()}
          </Link>
        }
      />
      {error ? (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          Could not load {resource.label.toLowerCase()}: {error.message}
        </p>
      ) : (
        <ResourceList resourceKey={key} rows={(data ?? []) as never} />
      )}
    </>
  );
}
