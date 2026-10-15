"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save, Trash2 } from "lucide-react";
import { deleteResource, saveResource, saveSingleton } from "@/app/admin/actions/content";
import { FieldRenderer } from "./field-renderer";
import { Button, ConfirmDialog, StatusBadge, btnClass } from "./ui";
import { buildSchema, defaultValues, toFormValues } from "@/lib/cms/fields";
import { getResource, PROFILE_CONFIG, resourceFields, SETTINGS_CONFIG, singletonFields } from "@/lib/cms/resources";

type Mode = { type: "resource"; key: string; id: string | null } | { type: "singleton"; key: "profile" | "settings" };

export function ContentForm({ mode, initial }: { mode: Mode; initial: Record<string, unknown> | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resource = mode.type === "resource" ? getResource(mode.key) : null;
  const singleton = mode.type === "singleton" ? (mode.key === "profile" ? PROFILE_CONFIG : SETTINGS_CONFIG) : null;
  const sections = resource?.sections ?? singleton?.sections ?? [];
  const fields = useMemo(
    () => (resource ? resourceFields(resource) : singleton ? singletonFields(singleton) : []),
    [resource, singleton],
  );
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const isNew = mode.type === "resource" && !mode.id;

  const methods = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema) as unknown as Resolver<Record<string, unknown>>,
    defaultValues: initial ? toFormValues(fields, initial) : defaultValues(fields),
    mode: "onBlur",
  });
  const {
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { isDirty, errors },
  } = methods;
  const status = watch("status") as string | undefined;
  const [savedStatus, setSavedStatus] = useState(initial?.status as string | undefined);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const onSubmit = (values: Record<string, unknown>) =>
    startTransition(async () => {
      const res =
        mode.type === "resource" ? await saveResource(mode.key, mode.id, values) : await saveSingleton(mode.key, values);
      if (!res.ok) {
        for (const [name, msgs] of Object.entries(res.fieldErrors ?? {})) {
          const field = name.split(".")[0]!;
          setError(field in values ? field : "root", { message: msgs[0] });
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Saved.");
      reset(values);
      setSavedStatus(values.status as string | undefined);
      if (mode.type === "resource" && !mode.id && res.data && "id" in res.data) {
        router.replace(`/admin/${mode.key}/${(res.data as { id: string }).id}`);
      }
      router.refresh();
    });

  const onInvalid = () => toast.error("Please fix the highlighted fields.");

  const remove = async () => {
    if (mode.type !== "resource" || !mode.id) return;
    setDeleting(true);
    const res = await deleteResource(mode.key, mode.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Deleted.");
    reset(methods.getValues());
    router.replace(`/admin/${mode.key}`);
    router.refresh();
  };

  const previewPath = resource?.publicPath && initial ? resource.publicPath(initial) : null;
  const backHref = mode.type === "resource" ? `/admin/${mode.key}` : "/admin";

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="pb-28">
        {errors.root?.message && (
          <p role="alert" className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errors.root.message}
          </p>
        )}
        <div className="grid gap-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="border-line rounded-2xl border bg-white/[0.02] p-5 sm:p-6"
              aria-labelledby={`sec-${section.title}`}
            >
              <h2 id={`sec-${section.title}`} className="text-base font-semibold">
                {section.title}
              </h2>
              {section.description && <p className="text-muted mt-1 text-sm">{section.description}</p>}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <FieldRenderer key={f.name} field={f} isNew={isNew} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="border-line bg-bg/85 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl lg:left-64">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:px-8">
            <Link href={backHref} className={btnClass("ghost")}>
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">Back</span>
            </Link>
            {status && <StatusBadge status={status} />}
            {isDirty && <span className="text-xs text-amber-200">Unsaved changes</span>}
            <div className="ml-auto flex flex-wrap gap-2">
              {mode.type === "resource" && mode.id && (
                <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
              {previewPath && (
                <a
                  href={`/api/preview?path=${encodeURIComponent(previewPath)}`}
                  target="_blank"
                  rel="noopener"
                  className={btnClass("secondary")}
                  title={isDirty ? "Save first to preview your latest changes" : "Preview on the site (drafts included)"}
                >
                  <Eye className="size-4" aria-hidden />
                  Preview
                </a>
              )}
              <Button type="submit" variant="primary" loading={pending}>
                {!pending && <Save className="size-4" aria-hidden />}
                {status === "draft"
                  ? "Save draft"
                  : status === "published"
                    ? savedStatus === "published"
                      ? "Save changes"
                      : "Save & publish"
                    : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        loading={deleting}
        title={`Delete this ${resource?.singular.toLowerCase() ?? "item"}?`}
        message="This permanently removes it from the website and the database. Uploaded files stay in the media library."
      />
    </FormProvider>
  );
}
