import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { PreviewBanner } from "@/components/site/preview-banner";
import { CursorGlow } from "@/components/effects/cursor-glow";
import { SoundProvider } from "@/components/effects/sound";
import { MotionProvider } from "@/components/ui/motion-provider";
import { getProfile, getSettings, getSocialLinks, isPreview } from "@/lib/data/public";
import { footerText, isPlaceholder, ownerName } from "@/lib/defaults";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, profile, social, preview] = await Promise.all([getSettings(), getProfile(), getSocialLinks(), isPreview()]);
  const resumeUrl = settings.show_resume ? profile.resume_url : null;
  const name = ownerName(profile, settings);

  return (
    <MotionProvider>
      <SoundProvider musicUrl={settings.music_url} title={settings.music_title}>
        <div className="site-root relative isolate min-h-dvh">
          <CursorGlow />
          <Header
            siteName={name}
            logoUrl={settings.logo_url}
            availability={isPlaceholder(profile.availability) ? "" : profile.availability}
            nav={settings.nav_items}
            resumeUrl={resumeUrl}
          />
          <main id="main" tabIndex={-1} className="relative z-[2] overflow-x-clip outline-none">
            {children}
          </main>
          <Footer
            siteName={name}
            footerText={footerText(settings, name)}
            links={settings.footer_links}
            nav={settings.nav_items}
            social={social}
            email={settings.contact_email}
          />
          {preview && <PreviewBanner />}
        </div>
      </SoundProvider>
    </MotionProvider>
  );
}
