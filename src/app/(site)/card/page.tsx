import type { Metadata } from "next";
import QRCode from "qrcode";
import { Mail, MapPin, Phone } from "lucide-react";
import { CardActions } from "@/components/site/card-actions";
import { SocialIcon } from "@/components/site/social-icon";
import { SmartImage } from "@/components/ui/smart-image";
import { getProfile, getSettings, getSocialLinks } from "@/lib/data/public";
import { isPlaceholder, ownerName } from "@/lib/defaults";
import { env } from "@/lib/env";
import { getCopy } from "@/lib/i18n/server";
import { initials } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.card.title, description: copy.card.lead, alternates: { canonical: "/card" } };
}

/** A digital business card: QR code to the site, "save contact" (vCard) and the main links. */
export default async function CardPage() {
  const [copy, profile, settings, social] = await Promise.all([getCopy(), getProfile(), getSettings(), getSocialLinks()]);
  const name = ownerName(profile, settings);
  const siteUrl = (settings.site_url || env.siteUrl).replace(/\/+$/, "");
  const headline = isPlaceholder(profile.headline) ? "" : profile.headline;
  const location = isPlaceholder(profile.location) ? "" : profile.location;
  // Dark modules on a transparent background, so it reads in both themes inside the white tile.
  const qr = await QRCode.toString(siteUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#141414", light: "#0000" },
  });

  return (
    <section className="mx-auto flex min-h-[85svh] w-[min(440px,calc(100%-2rem))] flex-col justify-center pt-28 pb-10">
      <div className="border-line bg-surface relative overflow-hidden rounded-[2rem] border p-7 text-center shadow-[var(--shadow-hover)] sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-60"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, var(--name-tint) 35%, transparent), transparent)",
          }}
        />
        <div className="border-line relative mx-auto grid size-20 place-items-center overflow-hidden rounded-full border bg-[var(--bg)] text-xl font-medium">
          {profile.avatar_url ? (
            <SmartImage src={profile.avatar_url} alt={profile.avatar_alt || name} fill sizes="80px" className="object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        <h1 className="font-display mt-5 text-[2rem] leading-tight text-[var(--name-tint)] normal-case italic">{name}</h1>
        {headline && <p className="mt-1 text-[var(--fg-secondary)]">{headline}</p>}
        {location && (
          <p className="text-muted mt-2 inline-flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5" aria-hidden /> {location}
          </p>
        )}

        <div className="mx-auto mt-7 w-44 rounded-2xl bg-[#fff] p-3.5 shadow-sm">
          <div
            className="aspect-square [&>svg]:size-full"
            role="img"
            aria-label={`QR: ${siteUrl}`}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        </div>
        <p className="text-subtle mt-3 text-xs">{copy.card.scan}</p>
        <p className="text-muted mt-1 font-mono text-xs">{siteUrl.replace(/^https?:\/\//, "")}</p>

        <div className="mt-7">
          <CardActions url={siteUrl} name={name} />
        </div>

        {(settings.contact_email || settings.contact_phone || social.length > 0) && (
          <ul className="border-line mt-7 flex flex-wrap justify-center gap-2 border-t pt-6">
            {settings.contact_email && (
              <li>
                <a href={`mailto:${settings.contact_email}`} aria-label="Email" className="ed-icon-btn">
                  <Mail className="size-4" aria-hidden />
                </a>
              </li>
            )}
            {settings.contact_phone && (
              <li>
                <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`} aria-label="Phone" className="ed-icon-btn">
                  <Phone className="size-4" aria-hidden />
                </a>
              </li>
            )}
            {social.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={l.label || l.platform}
                  className="ed-icon-btn"
                >
                  <SocialIcon platform={l.platform} className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-muted mt-5 text-center text-sm">{copy.card.lead}</p>
    </section>
  );
}
