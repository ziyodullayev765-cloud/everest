import { z } from "zod";
import { isSafeHref } from "@/lib/utils";

/**
 * Declarative field definitions. One definition drives three things:
 *  - the admin form UI (FieldRenderer),
 *  - the Zod schema used on the client for instant feedback, and
 *  - the SAME Zod schema re-run on the server before any database write.
 */
interface Base {
  name: string;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  /** Spans both columns in the two-column form grid. */
  wide?: boolean;
}

export type FieldDef =
  | (Base & { type: "text"; max?: number; min?: number })
  | (Base & { type: "textarea"; max?: number; rows?: number })
  | (Base & { type: "markdown"; max?: number; rows?: number })
  | (Base & { type: "url" })
  | (Base & { type: "email" })
  | (Base & { type: "slug"; from: string })
  | (Base & { type: "number"; min?: number; max?: number })
  | (Base & { type: "date" })
  | (Base & { type: "boolean" })
  | (Base & { type: "select"; options: { value: string; label: string }[] })
  | (Base & { type: "tags"; maxItems?: number; suggestions?: string[] })
  | (Base & { type: "list"; maxItems?: number })
  | (Base & { type: "image"; altField?: string })
  | (Base & { type: "file"; accept: "document" | "image" | "any" })
  | (Base & { type: "gallery"; maxItems?: number })
  | (Base & { type: "links"; maxItems?: number })
  | (Base & { type: "color" })
  | (Base & { type: "status" });

export interface FieldSection {
  title: string;
  description?: string;
  fields: FieldDef[];
}

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const safeUrl = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((v) => isSafeHref(v), "Use a full https:// URL, mailto:, tel: or a /relative path");

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function stringArray(maxItems: number, maxLen: number) {
  return z.preprocess(
    (v) => (Array.isArray(v) ? v.map((s) => (typeof s === "string" ? s.trim() : s)).filter(Boolean) : []),
    z.array(z.string().max(maxLen, `Each item must be at most ${maxLen} characters`)).max(maxItems, `At most ${maxItems} items`),
  );
}

export function fieldSchema(f: FieldDef): z.ZodTypeAny {
  switch (f.type) {
    case "text":
    case "textarea":
    case "markdown": {
      const max = f.max ?? (f.type === "text" ? 200 : 6000);
      let s = z.string({ invalid_type_error: "Required" }).trim().max(max, `At most ${max} characters`);
      if (f.required) s = s.min(f.type === "text" && f.min ? f.min : 1, `${f.label} is required`);
      return f.required ? s : z.preprocess((v) => v ?? "", s);
    }
    case "url":
    case "image":
    case "file":
      return f.required
        ? safeUrl
        : z
            .preprocess(emptyToNull, safeUrl.nullable())
            .optional()
            .transform((v) => v ?? null);
    case "email": {
      const s = z.string().trim().email("Enter a valid email address").max(254);
      return f.required
        ? s
        : z
            .preprocess(emptyToNull, s.nullable())
            .optional()
            .transform((v) => v ?? null);
    }
    case "slug":
      return z
        .string()
        .trim()
        .min(1, "Slug is required")
        .max(120)
        .regex(SLUG_RE, "Lowercase letters, numbers and single hyphens only");
    case "number": {
      let n = z.number({ invalid_type_error: "Enter a number" }).int("Whole numbers only");
      if (f.min !== undefined) n = n.min(f.min, `Minimum ${f.min}`);
      if (f.max !== undefined) n = n.max(f.max, `Maximum ${f.max}`);
      return z.preprocess(
        (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : Number(v)),
        f.required ? n : n.nullable(),
      );
    }
    case "date": {
      const d = z.string().regex(DATE_RE, "Use YYYY-MM-DD");
      return f.required
        ? d
        : z
            .preprocess(emptyToNull, d.nullable())
            .optional()
            .transform((v) => v ?? null);
    }
    case "boolean":
      return z.preprocess((v) => v === true || v === "true" || v === "on", z.boolean());
    case "select":
      return z.enum(f.options.map((o) => o.value) as [string, ...string[]], {
        errorMap: () => ({ message: `Choose a valid ${f.label.toLowerCase()}` }),
      });
    case "status":
      return z.enum(["draft", "published"]);
    case "tags":
      return stringArray(f.maxItems ?? 30, 60);
    case "list":
      return stringArray(f.maxItems ?? 20, 400);
    case "gallery":
      return z
        .array(z.object({ url: safeUrl, alt: z.string().trim().max(300).default("") }))
        .max(f.maxItems ?? 40, `At most ${f.maxItems ?? 40} images`)
        .default([]);
    case "links":
      return z
        .array(
          z.object({
            label: z.string().trim().min(1, "Label is required").max(60),
            href: safeUrl,
            visible: z.boolean().default(true),
          }),
        )
        .max(f.maxItems ?? 20)
        .default([]);
    case "color":
      return z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #10b981")
        .transform((v) => v.toLowerCase());
  }
}

export function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) shape[f.name] = fieldSchema(f);
  return z.object(shape);
}

/** Initial form values for a new record. */
export function defaultValues(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    switch (f.type) {
      case "boolean":
        out[f.name] = false;
        break;
      case "tags":
      case "list":
      case "gallery":
      case "links":
        out[f.name] = [];
        break;
      case "status":
        out[f.name] = "draft";
        break;
      case "select":
        out[f.name] = f.options[0]?.value ?? "";
        break;
      case "number":
        out[f.name] = "";
        break;
      case "color":
        out[f.name] = "#10b981";
        break;
      default:
        out[f.name] = "";
    }
  }
  return out;
}

/** Normalise a DB row into form values (nulls → "" so inputs stay controlled). */
export function toFormValues(fields: FieldDef[], row: Record<string, unknown>) {
  const base = defaultValues(fields);
  for (const f of fields) {
    const v = row[f.name];
    if (v === null || v === undefined) continue;
    base[f.name] = v;
  }
  return base;
}

/** Flattens Zod issues into { field: [messages] }. */
export function flattenErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
