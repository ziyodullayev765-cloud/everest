import { ContactForm } from "@/components/site/contact-form";
import { EdSection } from "@/components/site/ed-section";
import { SocialIcon } from "@/components/site/social-icon";
import { getCopy } from "@/lib/i18n/server";
import type { SocialLink } from "@/lib/types";
import { HomeHeading } from "./section-heading";

/** Project inquiry form with social links underneath. */
export async function Contact({ social, email }: { social: SocialLink[]; email: string | null }) {
  const copy = await getCopy();
  return (
    <EdSection id="contact" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-14 sm:py-24">
      <HomeHeading eyebrow={copy.homePage.contact} title={copy.sections.contactTitle} lead={copy.sections.contactLead} center />
      <div className="glow-card mx-auto mt-12 max-w-3xl p-6 sm:p-10">
        <ContactForm />
      </div>
      {(social.length > 0 || email) && (
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {social.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                target={s.url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer me"
                className="ed-button"
              >
                <SocialIcon platform={s.platform} url={s.url} className="size-4" />
                {s.label || s.platform}
              </a>
            </li>
          ))}
          {email && (
            <li>
              <a href={`mailto:${email}`} className="ed-button">
                <SocialIcon platform="email" url={`mailto:${email}`} className="size-4" />
                Email
              </a>
            </li>
          )}
        </ul>
      )}
    </EdSection>
  );
}
