import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { PreviewBanner } from "@/components/site/preview-banner";
import { CursorGlow } from "@/components/effects/cursor-glow";
import { MusicDock } from "@/components/effects/sound";
import { MediaGuard } from "@/components/effects/media-guard";
import { SmoothScroll } from "@/components/effects/smooth-scroll";
import { Parallax } from "@/components/effects/parallax";
import { SoundProvider } from "@/components/effects/sound";
import { MotionProvider } from "@/components/ui/motion-provider";
import { getPosts, getProfile, getProjects, getSettings, getSkills, getSocialLinks, isPreview } from "@/lib/data/public";
import { CommandPalette } from "@/components/site/command-palette";
import type { TerminalData } from "@/components/site/terminal";
import { footerText, isPlaceholder, ownerName } from "@/lib/defaults";
import { I18nProvider } from "@/components/i18n/provider";
import { localizeNav } from "@/lib/i18n/dictionaries";
import { getCopy, getLocale } from "@/lib/i18n/server";

/** Puts "Blog" into the menu (before Contact) once there is something to read. */
function withBlog<T extends { href: string; label: string; visible?: boolean }>(items: T[]): T[] {
  const blog = { label: "Blog", href: "/blog", visible: true } as T;
  const at = items.findIndex((i) => i.href === "/contact");
  return at < 0 ? [...items, blog] : [...items.slice(0, at), blog, ...items.slice(at)];
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, profile, social, preview, locale, copy, projects, posts, skills] = await Promise.all([
    getSettings(),
    getProfile(),
    getSocialLinks(),
    isPreview(),
    getLocale(),
    getCopy(),
    getProjects(),
    getPosts(),
    getSkills(),
  ]);
  const navItems =
    posts.length && !settings.nav_items.some((i) => i.href === "/blog") ? withBlog(settings.nav_items) : settings.nav_items;
  const nav = localizeNav(navItems, copy);
  const resumeUrl = settings.show_resume ? "/resume" : null;
  const name = ownerName(profile, settings);
  const pageLinks = [{ href: "/", label: copy.nav["/"]! }, ...nav, { href: "/about", label: copy.nav["/about"]! }];
  const palette: TerminalData = {
    name,
    headline: isPlaceholder(profile.headline) ? "" : profile.headline,
    email: settings.contact_email,
    cvHref: "/resume",
    pages: pageLinks
      .filter((p, i, all) => p.href.startsWith("/") && !p.href.startsWith("//") && all.findIndex((x) => x.href === p.href) === i)
      .map(({ href, label }) => ({ href, label })),
    projects: projects.map((p) => ({ title: p.title, slug: p.slug })),
    posts: posts.map((p) => ({ title: p.title, slug: p.slug })),
    social: social.map((l) => ({ label: l.label || l.platform, url: l.url })),
    skills: skills.map((s) => s.name),
  };

  return (
    <I18nProvider locale={locale}>
      <MotionProvider>
        <SoundProvider musicUrl={settings.music_url} title={settings.music_title}>
          <div className="site-root relative isolate min-h-dvh">
            <CursorGlow />
            <MusicDock />
            <MediaGuard />
            <SmoothScroll />
            <Parallax />
            <Header
              siteName={name}
              logoUrl={settings.logo_url}
              availability={isPlaceholder(profile.availability) ? "" : profile.availability}
              nav={nav}
              resumeUrl={resumeUrl}
            />
            <main id="main" tabIndex={-1} className="relative z-[2] overflow-x-clip outline-none">
              {children}
            </main>
            <Footer
              siteName={name}
              footerText={footerText(settings, name, copy.rights)}
              links={localizeNav(settings.footer_links, copy)}
              nav={nav}
              social={social}
              email={settings.contact_email}
              backToTop={copy.backToTop}
            />
            <CommandPalette data={palette} />
            {preview && <PreviewBanner />}
          </div>
        </SoundProvider>
      </MotionProvider>
    </I18nProvider>
  );
}
