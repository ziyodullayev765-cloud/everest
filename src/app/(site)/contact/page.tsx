import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { PageHeader } from "@/components/site/section-heading";
import { SocialIcon } from "@/components/site/social-icon";
import { Reveal } from "@/components/ui/reveal";
import { PageNext } from "@/components/site/page-next";
import { getCopy } from "@/lib/i18n/server";
import { getSettings, getSocialLinks } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.contact.title,
    description: copy.contact.lead,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const copy = await getCopy();
  const [settings, social] = await Promise.all([getSettings(), getSocialLinks()]);
  const details = [
    settings.contact_email && { icon: Mail, label: settings.contact_email, href: `mailto:${settings.contact_email}` },
    settings.contact_phone && {
      icon: Phone,
      label: settings.contact_phone,
      href: `tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`,
    },
    settings.contact_location && { icon: MapPin, label: settings.contact_location, href: null },
  ].filter(Boolean) as { icon: typeof Mail; label: string; href: string | null }[];

  return (
    <>
      <PageHeader title={copy.contact.title} lead={settings.contact_note || copy.contact.lead} />
      <section className="mx-auto grid w-[min(1200px,calc(100%-2rem))] gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <Reveal className="glass relative rounded-[2rem] p-6 sm:p-10">
          <ContactForm />
        </Reveal>
        <Reveal delay={0.1} className="grid content-start gap-6">
          {details.length > 0 && (
            <div className="glass rounded-[2rem] p-6 sm:p-8">
              <h2 className="ed-eyebrow">{copy.contact.details}</h2>
              <ul className="mt-5 grid gap-4">
                {details.map(({ icon: Icon, label, href }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="border-line grid size-10 shrink-0 place-items-center rounded-full border bg-[var(--surface-strong)]">
                      <Icon className="text-accent size-4" aria-hidden />
                    </span>
                    {href ? (
                      <a href={href} className="text-fg hover:text-accent break-all transition">
                        {label}
                      </a>
                    ) : (
                      <span className="text-fg">{label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {social.length > 0 && (
            <div className="glass rounded-[2rem] p-6 sm:p-8">
              <h2 className="ed-eyebrow">{copy.contact.social}</h2>
              <ul className="mt-5 grid gap-2">
                {social.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target={s.url.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer me"
                      className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-[color-mix(in_oklab,var(--fg)_5%,transparent)]"
                    >
                      <SocialIcon platform={s.platform} url={s.url} className="text-muted group-hover:text-accent size-5" />
                      <span className="font-medium">{s.platform}</span>
                      {s.label && <span className="text-subtle truncate text-sm">{s.label}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Reveal>
      </section>
      <PageNext current="/contact" />
    </>
  );
}
