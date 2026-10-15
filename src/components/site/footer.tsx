import Link from "next/link";
import { ArrowUp } from "lucide-react";
import type { NavItem, SocialLink } from "@/lib/types";
import { SocialIcon } from "./social-icon";

export function Footer({
  siteName,
  footerText,
  links,
  nav,
  social,
  email,
}: {
  siteName: string;
  footerText: string;
  links: NavItem[];
  nav: NavItem[];
  social: SocialLink[];
  email: string | null;
}) {
  return (
    <footer className="border-line relative mt-32 border-t">
      <div className="container-x py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{siteName}</p>
            {email && (
              <a href={`mailto:${email}`} className="text-muted hover:text-accent mt-3 inline-block transition">
                {email}
              </a>
            )}
            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {social.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target={s.url.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer me"
                      aria-label={s.label || s.platform}
                      title={s.label || s.platform}
                      className="text-muted hover:text-fg grid size-11 place-items-center rounded-full ring-1 ring-white/10 transition hover:ring-white/25"
                    >
                      <SocialIcon platform={s.platform} url={s.url} className="size-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <nav aria-label="Footer">
            <ul className="grid gap-2.5 text-sm">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-muted hover:text-fg transition">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col items-start gap-2.5 text-sm md:items-end">
            {links.map((n) => (
              <Link key={n.href} href={n.href} className="text-muted hover:text-fg transition">
                {n.label}
              </Link>
            ))}
            <a href="#main" className="text-muted hover:text-fg mt-4 inline-flex items-center gap-2 transition">
              <ArrowUp className="size-4" aria-hidden /> Yuqoriga
            </a>
          </div>
        </div>
        <div className="hairline my-10" />
        <p className="text-subtle text-sm">{footerText}</p>
      </div>
    </footer>
  );
}
