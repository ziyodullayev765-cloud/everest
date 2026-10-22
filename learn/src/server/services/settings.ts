import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db, schema } from "../db";
import { DEFAULT_SCALE, validateScale, type ScaleBand } from "@/lib/grading";
import { DEFAULT_XP_RULES, type XpRules } from "@/lib/gamification";
import { isAdmin, type Actor } from "../auth/rbac";
import { forbidden, invalid } from "../errors";
import { audit } from "./audit";
import { sql } from "drizzle-orm";
import { tr } from "@/lib/i18n/tr";

export type PlatformSettings = {
  branding: { appName: string; shortName: string; primaryColor: string; logoFileId: string | null };
  grading: { scale: ScaleBand[] };
  gamification: { enabled: boolean; rules: XpRules };
  languages: { enabled: string[]; default: string };
  assignmentDefaults: { maxScore: number; allowLate: boolean; latePenaltyPercent: number; maxAttempts: number; reviewMode: "never" | "after_submit" | "after_due" | "after_grading" };
  profile: { studentsCanEditDisplayName: boolean; studentsCanEditAvatar: boolean };
  notificationTemplates: { newAssignment: string; deadline: string; graded: string; weekly: string };
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  branding: { get appName() { return tr("Everest Ta’lim"); }, shortName: "Everest", primaryColor: "#0f7a5a", logoFileId: null },
  grading: { scale: DEFAULT_SCALE },
  gamification: { enabled: true, rules: DEFAULT_XP_RULES },
  languages: { enabled: ["uz"], default: "uz" },
  assignmentDefaults: { maxScore: 100, allowLate: true, latePenaltyPercent: 10, maxAttempts: 1, reviewMode: "after_submit" },
  profile: { studentsCanEditDisplayName: false, studentsCanEditAvatar: true },
  notificationTemplates: {
    newAssignment: "Yangi vazifa: {title}",
    deadline: "Muddat yaqinlashmoqda: {title}",
    get graded() { return tr("Baho e’lon qilindi: {title}"); },
    get weekly() { return tr("Haftalik hisobotingiz tayyor"); },
  },
};

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Rang #RRGGBB ko‘rinishida bo‘lishi kerak");
const nonNeg = z.coerce.number().int().min(0).max(1000);

export const settingsSchema = z.object({
  branding: z.object({
    appName: z.string().trim().min(2).max(60),
    shortName: z.string().trim().min(2).max(20),
    primaryColor: hex,
    logoFileId: z.string().uuid().nullable(),
  }),
  grading: z.object({
    scale: z.array(z.object({ min: z.coerce.number().min(0).max(100), label: z.string().trim().min(1).max(10), name: z.string().trim().max(30) })),
  }),
  gamification: z.object({
    enabled: z.boolean(),
    rules: z.object({
      submitOnTime: nonNeg,
      submitLate: nonNeg,
      quizCompleted: nonNeg,
      quizPerTenPercent: nonNeg,
      quizPerfectBonus: nonNeg,
      materialRead: nonNeg,
    }),
  }),
  languages: z.object({ enabled: z.array(z.enum(["uz", "en", "ru"])).min(1), default: z.enum(["uz", "en", "ru"]) }),
  assignmentDefaults: z.object({
    maxScore: z.coerce.number().min(1).max(1000),
    allowLate: z.boolean(),
    latePenaltyPercent: z.coerce.number().int().min(0).max(100),
    maxAttempts: z.coerce.number().int().min(1).max(20),
    reviewMode: z.enum(["never", "after_submit", "after_due", "after_grading"]),
  }),
  profile: z.object({ studentsCanEditDisplayName: z.boolean(), studentsCanEditAvatar: z.boolean() }),
  notificationTemplates: z.object({
    newAssignment: z.string().trim().min(3).max(120),
    deadline: z.string().trim().min(3).max(120),
    graded: z.string().trim().min(3).max(120),
    weekly: z.string().trim().min(3).max(120),
  }),
});

function deepMerge<T>(base: T, over: unknown): T {
  if (!over || typeof over !== "object" || Array.isArray(over)) return (over as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? deepMerge(b, v) : v;
  }
  return out as T;
}

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const rows = await db.select().from(schema.settings).where(sql`${schema.settings.key} = 'platform'`);
  return deepMerge(DEFAULT_SETTINGS, rows[0]?.value);
});

export async function updateSettings(actor: Actor, input: unknown) {
  if (!isAdmin(actor)) throw forbidden();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? tr("Noto‘g‘ri qiymat"));
  const scaleProblem = validateScale(parsed.data.grading.scale);
  if (scaleProblem) throw invalid(scaleProblem);
  if (!parsed.data.languages.enabled.includes(parsed.data.languages.default)) throw invalid(tr("Asosiy til yoqilgan tillar ichida bo‘lishi kerak."));
  await db
    .insert(schema.settings)
    .values({ key: "platform", value: parsed.data, updatedBy: actor.id })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: parsed.data, updatedAt: new Date(), updatedBy: actor.id } });
  await audit(actor.id, "settings.update", "settings", "platform");
}

export function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
