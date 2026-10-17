import { getProfile, getSettings, getSocialLinks } from "@/lib/data/public";
import { isPlaceholder, ownerName } from "@/lib/defaults";
import { env } from "@/lib/env";
import { buildVCard } from "@/lib/vcard";

/** Contact card for "Save contact" on /card. */
export async function GET() {
  const [profile, settings, social] = await Promise.all([getProfile(), getSettings(), getSocialLinks()]);
  const name = ownerName(profile, settings);
  const text = buildVCard({
    name,
    title: isPlaceholder(profile.headline) ? "" : profile.headline,
    email: settings.contact_email,
    phone: settings.contact_phone,
    url: (settings.site_url || env.siteUrl).replace(/\/+$/, ""),
    location: isPlaceholder(profile.location) ? "" : profile.location,
    links: social.filter((l) => /^https:/.test(l.url)).map((l) => ({ label: l.platform || "web", url: l.url })),
  });
  return new Response(text, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="contact.vcf"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
