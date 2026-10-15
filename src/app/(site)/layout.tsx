import { Backdrop } from "@/components/site/backdrop";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { PreviewBanner } from "@/components/site/preview-banner";
import { MotionProvider } from "@/components/ui/motion-provider";
import { getProfile, getSettings, getSocialLinks, isPreview } from "@/lib/data/public";

export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, profile, social, preview] = await Promise.all([getSettings(), getProfile(), getSocialLinks(), isPreview()]);
  const resumeUrl = settings.show_resume ? profile.resume_url : null;

  return (
    <MotionProvider>
      <Backdrop />
      <Header siteName={settings.site_name} logoUrl={settings.logo_url} nav={settings.nav_items} resumeUrl={resumeUrl} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer
        siteName={settings.site_name}
        footerText={settings.footer_text}
        links={settings.footer_links}
        nav={settings.nav_items}
        social={social}
        email={settings.contact_email}
      />
      {preview && <PreviewBanner />}
    </MotionProvider>
  );
}
