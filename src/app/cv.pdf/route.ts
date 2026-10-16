import {
  getAchievements,
  getEducation,
  getExperience,
  getProfile,
  getProjects,
  getSettings,
  getSkills,
  getSocialLinks,
} from "@/lib/data/public";
import { buildCv } from "@/lib/cv/build";
import { isPlaceholder, ownerName } from "@/lib/defaults";
import { env } from "@/lib/env";
import { getLocale } from "@/lib/i18n/server";

/** A CV generated on demand from the published content, in the visitor's language. */
export async function GET() {
  const [locale, profile, settings, social, experience, education, projects, skills, achievements] = await Promise.all([
    getLocale(),
    getProfile(),
    getSettings(),
    getSocialLinks(),
    getExperience(),
    getEducation(),
    getProjects(),
    getSkills(),
    getAchievements(),
  ]);
  const clean = <T extends object>(o: T, keys: (keyof T)[]) => {
    const out = { ...o };
    for (const k of keys) if (typeof out[k] === "string" && isPlaceholder(out[k] as string)) (out[k] as string) = "";
    return out;
  };
  const name = ownerName(profile, settings);
  const bytes = await buildCv({
    locale,
    name,
    profile: clean(profile, ["headline", "short_intro", "bio", "location"]),
    email: settings.contact_email,
    siteUrl: (settings.site_url || env.siteUrl).replace(/\/+$/, ""),
    social,
    experience,
    education,
    projects,
    skills,
    achievements,
  });
  const file = `${name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "cv"}-CV.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cv.pdf"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
