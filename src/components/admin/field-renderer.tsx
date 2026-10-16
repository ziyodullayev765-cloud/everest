"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Link2, Music, Plus, Trash2, Wand2, X } from "lucide-react";
import { MediaPicker } from "./media-picker";
import { Button, Input, Select, Switch, Textarea, btnClass, inputClass } from "./ui";
import type { FieldDef } from "@/lib/cms/fields";
import { CONTENT_LOCALES, TRANSLATABLE } from "@/lib/i18n/content";
import type { GalleryImage, NavItem } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

function FieldShell({
  field,
  error,
  children,
  counter,
}: {
  field: FieldDef;
  error?: string;
  children: ReactNode;
  counter?: ReactNode;
}) {
  const id = `f-${field.name}`;
  const noLabel = field.type === "boolean";
  return (
    <div className={cn(field.wide && "sm:col-span-2")}>
      {!noLabel && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-fg/90 text-sm font-medium">
            {field.label}
            {field.required && (
              <span className="text-accent ml-0.5" aria-hidden>
                *
              </span>
            )}
          </label>
          {counter}
        </div>
      )}
      {children}
      {field.help && !error && (
        <p id={`${id}-help`} className="text-subtle mt-1.5 text-xs">
          {field.help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function Counter({ name, max }: { name: string; max?: number }) {
  const value = useWatch({ name }) as string | undefined;
  if (!max) return null;
  const len = value?.length ?? 0;
  return (
    <span className={cn("text-[0.7rem] tabular-nums", len > max ? "text-red-300" : "text-subtle")}>
      {len}/{max}
    </span>
  );
}

function TagInput({
  value,
  onChange,
  id,
  invalid,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  };
  return (
    <div className={cn(inputClass, "flex min-h-11 flex-wrap items-center gap-1.5 py-2")} aria-invalid={invalid}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-white/[0.07] px-2 py-0.5 text-xs">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Remove ${t}`}
            className="text-subtle hover:text-fg"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : (placeholder ?? "Type and press Enter")}
        className="placeholder:text-subtle min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function MediaField({
  value,
  onChange,
  kind,
  id,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  kind: "image" | "document" | "audio" | "any";
  id: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const isImage = kind === "image" || (kind === "any" && /\.(png|jpe?g|webp|avif|gif|ico)(\?|$)/i.test(value));
  return (
    <div className="border-line rounded-xl border bg-white/[0.02] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="border-line grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white/[0.03]">
          {value ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="size-full object-cover" />
            ) : kind === "audio" || /\.(mp3|m4a|ogg|wav|aac|webm)(\?|$)/i.test(value) ? (
              <Music className="text-subtle size-7" aria-hidden />
            ) : (
              <FileText className="text-subtle size-7" aria-hidden />
            )
          ) : (
            <ImagePlus className="text-subtle size-6" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {value && !manual && (
            <p className="text-subtle mb-2 truncate text-xs" title={value}>
              {value}
            </p>
          )}
          {manual && (
            <Input
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
              aria-invalid={invalid}
              className="mb-2"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => setOpen(true)} id={manual ? undefined : id}>
              <ImagePlus className="size-3.5" aria-hidden />
              {value ? "Change" : kind === "document" ? "Choose / upload file" : "Choose / upload"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setManual((m) => !m)}>
              <Link2 className="size-3.5" aria-hidden />
              {manual ? "Hide URL" : "Paste URL"}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange("")}>
                <Trash2 className="size-3.5" aria-hidden />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        kind={kind === "any" ? undefined : kind}
        onSelect={([m]) => m && onChange(m.url)}
      />
    </div>
  );
}

function GalleryField({ value, onChange }: { value: GalleryImage[]; onChange: (v: GalleryImage[]) => void }) {
  const [open, setOpen] = useState(false);
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 grid gap-2">
          {value.map((img, i) => (
            <li key={`${img.url}-${i}`} className="border-line flex items-center gap-3 rounded-xl border bg-white/[0.02] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
              <Input
                value={img.alt}
                onChange={(e) => onChange(value.map((g, k) => (k === i ? { ...g, alt: e.target.value } : g)))}
                placeholder="Alt text (describe the image)"
                aria-label={`Alt text for image ${i + 1}`}
              />
              <div className="flex shrink-0">
                <button
                  type="button"
                  className={btnClass("ghost", "sm", "px-2")}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={btnClass("ghost", "sm", "px-2")}
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={btnClass("ghost", "sm", "px-2 text-red-300")}
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                  aria-label="Remove image"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" aria-hidden />
        Add images
      </Button>
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        kind="image"
        multiple
        onSelect={(items) => onChange([...value, ...items.map((m) => ({ url: m.url, alt: m.alt_text }))])}
      />
    </div>
  );
}

function LinksField({ value, onChange }: { value: NavItem[]; onChange: (v: NavItem[]) => void }) {
  const set = (i: number, patch: Partial<NavItem>) => onChange(value.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div>
      <ul className="grid gap-2">
        {value.map((l, i) => (
          <li key={i} className="border-line grid gap-2 rounded-xl border bg-white/[0.02] p-2 sm:grid-cols-[1fr_1.3fr_auto]">
            <Input
              value={l.label}
              onChange={(e) => set(i, { label: e.target.value })}
              placeholder="Label"
              aria-label={`Link ${i + 1} label`}
            />
            <Input
              value={l.href}
              onChange={(e) => set(i, { href: e.target.value })}
              placeholder="/about or https://…"
              aria-label={`Link ${i + 1} URL`}
            />
            <div className="flex items-center gap-1">
              <Switch
                id={`link-vis-${i}`}
                checked={l.visible !== false}
                onChange={(v) => set(i, { visible: v })}
                label={<span className="sr-only">Visible</span>}
              />
              <button
                type="button"
                className={btnClass("ghost", "sm", "px-2")}
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
              >
                <ArrowUp className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={btnClass("ghost", "sm", "px-2")}
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
                aria-label="Move down"
              >
                <ArrowDown className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={btnClass("ghost", "sm", "px-2 text-red-300")}
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                aria-label="Remove link"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button size="sm" className="mt-2" onClick={() => onChange([...value, { label: "", href: "/", visible: true }])}>
        <Plus className="size-3.5" aria-hidden />
        Add link
      </Button>
    </div>
  );
}

/**
 * Uzbek / Russian copies of a record's text. One tab per language; each input
 * shows the main (default-language) text as its placeholder. Anything left
 * empty falls back to the main text on the site.
 */
function TranslationsField({ name, table }: { name: string; table: string }) {
  const { register, control } = useFormContext();
  const [tab, setTab] = useState<string>(CONTENT_LOCALES[0].code);
  const fields = TRANSLATABLE[table] ?? [];
  const originals = useWatch({ name: fields.map((f) => f.name) }) as unknown[];
  return (
    <div className="border-line rounded-xl border bg-white/[0.02] p-3 sm:p-4">
      <div className="border-line mb-4 flex gap-1 rounded-xl border p-1 text-sm" role="tablist">
        {CONTENT_LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="tab"
            aria-selected={tab === l.code}
            onClick={() => setTab(l.code)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 transition",
              tab === l.code ? "text-fg bg-white/10" : "text-muted hover:text-fg",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
      {CONTENT_LOCALES.map((l) => (
        <div key={l.code} hidden={tab !== l.code} className="grid gap-4">
          {fields.map((f, i) => {
            const path = `${name}.${l.code}.${f.name}`;
            const id = `f-${name}-${l.code}-${f.name}`;
            const original = originals[i];
            const placeholder = Array.isArray(original) ? original.join("\n") : typeof original === "string" ? original : "";
            return (
              <div key={f.name}>
                <label htmlFor={id} className="text-fg/90 mb-1.5 block text-sm font-medium">
                  {f.label} <span className="text-subtle font-normal">· {l.label}</span>
                </label>
                {f.type === "text" ? (
                  <Input id={id} {...register(path)} placeholder={placeholder} />
                ) : f.type === "list" ? (
                  <Controller
                    control={control}
                    name={path}
                    render={({ field: c }) => (
                      <Textarea
                        id={id}
                        rows={3}
                        placeholder={placeholder}
                        value={((c.value as string[] | undefined) ?? []).join("\n")}
                        onChange={(e) => c.onChange(e.target.value.split("\n"))}
                        onBlur={() => c.onChange(((c.value as string[] | undefined) ?? []).map((s) => s.trim()).filter(Boolean))}
                      />
                    )}
                  />
                ) : (
                  <Textarea
                    id={id}
                    {...register(path)}
                    rows={f.type === "markdown" ? 6 : 3}
                    placeholder={placeholder}
                    className={f.type === "markdown" ? "font-mono text-[0.82rem]" : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function FieldRenderer({ field, isNew }: { field: FieldDef; isNew: boolean }) {
  const {
    register,
    control,
    setValue,
    getFieldState,
    formState: { errors },
  } = useFormContext();
  const id = `f-${field.name}`;
  const error = errors[field.name]?.message as string | undefined;
  const aria = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : field.help ? `${id}-help` : undefined,
  };

  // Slug: follow the source field for new records until the editor edits the slug.
  const source = useWatch({ name: field.type === "slug" ? field.from : "__none__" }) as string | undefined;
  useEffect(() => {
    if (field.type !== "slug" || !isNew) return;
    if (getFieldState(field.name).isDirty) return;
    setValue(field.name, slugify(source ?? ""), { shouldValidate: false });
  }, [field, source, isNew, setValue, getFieldState]);

  switch (field.type) {
    case "text":
    case "url":
    case "email":
      return (
        <FieldShell
          field={field}
          error={error}
          counter={field.type === "text" ? <Counter name={field.name} max={field.max} /> : undefined}
        >
          <Input
            {...register(field.name)}
            {...aria}
            type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
            inputMode={field.type === "url" ? "url" : field.type === "email" ? "email" : undefined}
            placeholder={field.placeholder ?? (field.type === "url" ? "https://" : undefined)}
          />
        </FieldShell>
      );
    case "textarea":
    case "markdown":
      return (
        <FieldShell field={field} error={error} counter={<Counter name={field.name} max={field.max} />}>
          <Textarea
            {...register(field.name)}
            {...aria}
            rows={field.rows ?? 4}
            placeholder={field.placeholder}
            className={field.type === "markdown" ? "font-mono text-[0.82rem]" : undefined}
          />
        </FieldShell>
      );
    case "slug":
      return (
        <FieldShell field={field} error={error}>
          <div className="flex gap-2">
            <Input {...register(field.name)} {...aria} placeholder="my-project" autoCapitalize="off" spellCheck={false} />
            <Button
              size="md"
              variant="ghost"
              onClick={() => setValue(field.name, slugify(source ?? ""), { shouldDirty: true, shouldValidate: true })}
              aria-label="Generate slug from title"
              title="Generate from title"
            >
              <Wand2 className="size-4" aria-hidden />
            </Button>
          </div>
        </FieldShell>
      );
    case "number":
      return (
        <FieldShell field={field} error={error}>
          <Input
            {...register(field.name)}
            {...aria}
            type="number"
            inputMode="numeric"
            min={field.min}
            max={field.max}
            step={1}
            placeholder={field.placeholder}
          />
        </FieldShell>
      );
    case "date":
      return (
        <FieldShell field={field} error={error}>
          <Input {...register(field.name)} {...aria} type="date" className="[color-scheme:dark]" />
        </FieldShell>
      );
    case "select":
      return (
        <FieldShell field={field} error={error}>
          <Select {...register(field.name)} {...aria}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value} className="bg-bg-elevated">
                {o.label}
              </option>
            ))}
          </Select>
        </FieldShell>
      );
    case "boolean":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => <Switch id={id} checked={!!f.value} onChange={f.onChange} label={field.label} />}
          />
        </FieldShell>
      );
    case "status":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <div id={id} role="radiogroup" aria-label="Status" className="border-line inline-flex rounded-xl border p-1">
                {(["draft", "published"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={f.value === s}
                    onClick={() => f.onChange(s)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm transition",
                      f.value === s
                        ? s === "published"
                          ? "bg-accent text-black"
                          : "bg-amber-300/90 text-black"
                        : "text-muted hover:text-fg",
                    )}
                  >
                    {s === "draft" ? "Draft" : "Published"}
                  </button>
                ))}
              </div>
            )}
          />
        </FieldShell>
      );
    case "tags":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <TagInput
                id={id}
                value={(f.value as string[]) ?? []}
                onChange={f.onChange}
                invalid={!!error}
                placeholder={field.placeholder}
              />
            )}
          />
        </FieldShell>
      );
    case "translations":
      return (
        <FieldShell
          field={field}
          error={errors[field.name] ? "Some translations are too long — check each language tab." : undefined}
        >
          <TranslationsField name={field.name} table={field.table} />
        </FieldShell>
      );
    case "list":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <Textarea
                {...aria}
                rows={4}
                value={((f.value as string[]) ?? []).join("\n")}
                onChange={(e) => f.onChange(e.target.value.split("\n"))}
                onBlur={() => f.onChange(((f.value as string[]) ?? []).map((s) => s.trim()).filter(Boolean))}
              />
            )}
          />
        </FieldShell>
      );
    case "image":
    case "file":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <MediaField
                id={id}
                value={(f.value as string) ?? ""}
                onChange={f.onChange}
                kind={field.type === "image" ? "image" : field.accept}
                invalid={!!error}
              />
            )}
          />
        </FieldShell>
      );
    case "gallery":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => <GalleryField value={(f.value as GalleryImage[]) ?? []} onChange={f.onChange} />}
          />
        </FieldShell>
      );
    case "links":
      return (
        <FieldShell
          field={field}
          error={error ?? (Object.keys(errors[field.name] ?? {}).length ? "Check the labels and URLs of each link." : undefined)}
        >
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => <LinksField value={(f.value as NavItem[]) ?? []} onChange={f.onChange} />}
          />
        </FieldShell>
      );
    case "color":
      return (
        <FieldShell field={field} error={error}>
          <Controller
            control={control}
            name={field.name}
            render={({ field: f }) => (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(f.value as string) ? (f.value as string) : "#10b981"}
                  onChange={(e) => f.onChange(e.target.value)}
                  aria-label={`${field.label} picker`}
                  className="border-line h-11 w-14 cursor-pointer rounded-xl border bg-transparent p-1"
                />
                <Input
                  {...aria}
                  value={(f.value as string) ?? ""}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="max-w-36 font-mono"
                />
                <div className="flex gap-1.5" role="group" aria-label="Presets">
                  {["#10b981", "#22c55e", "#14b8a6", "#34d399", "#a3e635"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => f.onChange(c)}
                      className="size-7 rounded-full ring-1 ring-white/15"
                      style={{ background: c }}
                      aria-label={`Use ${c}`}
                    />
                  ))}
                </div>
              </div>
            )}
          />
        </FieldShell>
      );
  }
}
