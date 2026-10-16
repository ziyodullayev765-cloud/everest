/**
 * Per-language copies of CMS text. Each content row has a `translations`
 * JSON column shaped like { uz: { summary: "…" }, ru: { … } }. The main
 * columns hold the default (English) text; a translated value, when filled
 * in, replaces it for visitors who chose that language.
 */
export const CONTENT_LOCALES = [
  { code: "uz", label: "O‘zbekcha" },
  { code: "ru", label: "Русский" },
] as const;

export type ContentLocale = (typeof CONTENT_LOCALES)[number]["code"];

export interface TranslatableField {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown" | "list";
  max?: number;
}

/** Which columns of each table can be translated. */
export const TRANSLATABLE: Record<string, TranslatableField[]> = {
  site_settings: [
    { name: "hero_eyebrow", label: "Eyebrow text", type: "text", max: 120 },
    { name: "hero_title", label: "Hero title", type: "text", max: 200 },
    { name: "hero_description", label: "Hero description", type: "textarea", max: 800 },
    { name: "cta_primary_label", label: "Primary button", type: "text", max: 60 },
    { name: "cta_secondary_label", label: "Secondary button", type: "text", max: 60 },
    { name: "ticker_items", label: "Ticker words", type: "list", max: 80 },
    { name: "contact_note", label: "Note on the contact page", type: "textarea", max: 600 },
    { name: "footer_text", label: "Footer text", type: "textarea", max: 400 },
    { name: "seo_description", label: "Default page description", type: "textarea", max: 320 },
    { name: "privacy_policy", label: "Privacy policy", type: "markdown", max: 30000 },
  ],
  profiles: [
    { name: "headline", label: "Professional title", type: "text", max: 160 },
    { name: "short_intro", label: "Short introduction", type: "textarea", max: 600 },
    { name: "location", label: "Location", type: "text", max: 160 },
    { name: "availability", label: "Availability", type: "text", max: 160 },
    { name: "bio", label: "Bio", type: "markdown", max: 6000 },
    { name: "story", label: "Story", type: "markdown", max: 10000 },
    { name: "background", label: "Background", type: "markdown", max: 6000 },
    { name: "learning_journey", label: "Learning journey", type: "markdown", max: 6000 },
    { name: "goals", label: "Goals", type: "markdown", max: 4000 },
    { name: "interests", label: "Interests", type: "list", max: 80 },
  ],
  projects: [
    { name: "title", label: "Title", type: "text", max: 160 },
    { name: "summary", label: "Short summary", type: "textarea", max: 400 },
    { name: "role", label: "Your role", type: "text", max: 160 },
    { name: "category", label: "Category", type: "text", max: 80 },
    { name: "description", label: "Full description", type: "markdown", max: 20000 },
  ],
  achievements: [
    { name: "title", label: "Title", type: "text", max: 200 },
    { name: "organization", label: "Organization", type: "text", max: 200 },
    { name: "category", label: "Category", type: "text", max: 80 },
    { name: "description", label: "Description", type: "markdown", max: 6000 },
  ],
  experience: [
    { name: "organization", label: "Organization", type: "text", max: 200 },
    { name: "role", label: "Role", type: "text", max: 200 },
    { name: "employment_type", label: "Employment type", type: "text", max: 80 },
    { name: "period_label", label: "Period (free text)", type: "text", max: 60 },
    { name: "location", label: "Location", type: "text", max: 160 },
    { name: "description", label: "Description", type: "markdown", max: 6000 },
    { name: "highlights", label: "Highlights", type: "list", max: 300 },
  ],
  education: [
    { name: "program", label: "Program", type: "text", max: 200 },
    { name: "field", label: "Field of study", type: "text", max: 200 },
    { name: "location", label: "Location", type: "text", max: 160 },
    { name: "description", label: "Description", type: "markdown", max: 6000 },
  ],
  skills: [
    { name: "category", label: "Category", type: "text", max: 80 },
    { name: "description", label: "Description", type: "textarea", max: 600 },
  ],
  stats: [
    { name: "label", label: "Label", type: "text", max: 80 },
    { name: "description", label: "Description", type: "text", max: 200 },
  ],
};

/** Returns the row with the visitor's language filled in over the default text. */
export function localizeRow<T extends object>(row: T, table: string, locale: string): T {
  const all = (row as { translations?: unknown }).translations;
  if (!all || typeof all !== "object") return row;
  const t = (all as Record<string, unknown>)[locale];
  if (!t || typeof t !== "object") return row;
  const out = { ...row } as Record<string, unknown>;
  for (const f of TRANSLATABLE[table] ?? []) {
    const v = (t as Record<string, unknown>)[f.name];
    if (f.type === "list") {
      if (Array.isArray(v)) {
        const items = v.filter((s): s is string => typeof s === "string" && s.trim() !== "");
        if (items.length) out[f.name] = items;
      }
    } else if (typeof v === "string" && v.trim()) {
      out[f.name] = v;
    }
  }
  return out as T;
}
