import Link from "next/link";
import { ArrowUp } from "lucide-react";
import type { NavItem, SocialLink } from "@/lib/types";
import { SocialIcon } from "./social-icon";
import { TerminalButton } from "./palette-triggers";
import { LiveVisitors } from "@/components/effects/live-visitors";

export function Footer({
  siteName,
  footerText,
  links,
  nav,
  social,
  email,
  backToTop,
}: {
  siteName: string;
  footerText: string;
  links: NavItem[];
  nav: NavItem[];
  social: SocialLink[];
  email: string | null;
  backToTop: string;
}) {
  return (
    <footer className="border-line bg-bg relative z-[3] mt-16 border-t">
      <div className="container-x flex flex-col items-center gap-8 py-14 text-center">
        <p className="font-display text-lg tracking-[0.06em]">{siteName}</p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.78rem] tracking-[0.04em] uppercase">
            {[...nav, ...links].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-muted hover:text-fg transition">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {(social.length > 0 || email) && (
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {social.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target={s.url.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer me"
                  aria-label={s.label || s.platform}
                  title={s.label || s.platform}
                  className="border-line text-muted hover:border-line-strong hover:text-fg grid size-10 place-items-center rounded-full border transition"
                >
                  <SocialIcon platform={s.platform} url={s.url} className="size-4" />
                </a>
              </li>
            ))}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="text-muted hover:text-accent ml-2 text-sm transition">
                  {email}
                </a>
              </li>
            )}
          </ul>
        )}
        <div className="border-line flex w-full flex-col items-center justify-between gap-3 border-t pt-6 text-sm sm:flex-row">
          <p className="text-muted">{footerText}</p>
          <LiveVisitors />
          <TerminalButton />
          <a
            href="#main"
            className="text-muted hover:text-fg inline-flex items-center gap-2 text-[0.78rem] tracking-[0.04em] uppercase transition"
          >
            <ArrowUp className="size-3.5" aria-hidden /> {backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
