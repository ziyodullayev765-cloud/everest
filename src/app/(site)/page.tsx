import { Contact } from "@/components/home/contact";
import { Experience } from "@/components/home/experience";
import { Hero } from "@/components/home/hero";
import { Highlights } from "@/components/home/highlights";
import { Projects } from "@/components/home/projects";
import { Skills } from "@/components/home/skills";
import { GithubActivity } from "@/components/home/github-activity";
import { Testimonials } from "@/components/home/testimonials";
import { NowLine } from "@/components/home/now-line";
import { getContributions, githubUserFromUrl, isGithubUsername } from "@/lib/github";
import type { DomeTileData } from "@/components/site/dome-gallery";
import {
  getAchievements,
  getExperience,
  getGallery,
  getProfile,
  getProjects,
  getSettings,
  getSkills,
  getSocialLinks,
  getStats,
  getTestimonials,
} from "@/lib/data/public";
import { DEFAULT_SETTINGS, isPlaceholder, ownerName } from "@/lib/defaults";
import { getCopy } from "@/lib/i18n/server";
import { unique } from "@/lib/utils";

const FALLBACK_WORDS = ["Projects", "Highlights", "Experience", "Skills", "Journey", "Ideas", "Craft", "Contact"];

/** A button label left at its built-in default follows the interface language. */
function uiLabel(value: string, builtIn: string, translated: string) {
  return !value.trim() || value.trim() === builtIn ? translated : value;
}

export default async function HomePage() {
  const copy = await getCopy();
  const [settings, profile, projects, achievements, skills, stats, experience, social, gallery, testimonials] = await Promise.all(
    [
      getSettings(),
      getProfile(),
      getProjects(),
      getAchievements(),
      getSkills(),
      getStats(),
      getExperience(),
      getSocialLinks(),
      getGallery(),
      getTestimonials(),
    ],
  );

  const name = ownerName(profile, settings);
  const githubUser =
    (isGithubUsername(settings.github_username) && settings.github_username) ||
    social.map((l) => githubUserFromUrl(l.url)).find(Boolean) ||
    null;
  const github = githubUser ? await getContributions(githubUser) : null;
  const featured = projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects;
  const highlights = (achievements.some((a) => a.featured) ? achievements.filter((a) => a.featured) : achievements).slice(0, 8);
  const subtitle = [settings.hero_description, profile.short_intro, profile.headline].find((t) => t && !isPlaceholder(t)) ?? "";

  // Dome tiles: every image in the CMS, otherwise labelled placeholder tiles.
  const images: DomeTileData[] = [
    ...gallery.map((m) => ({ src: m.url, alt: m.alt_text, label: m.caption })),
    ...projects.flatMap((p) => [
      ...(p.thumbnail_url ? [{ src: p.thumbnail_url, alt: p.thumbnail_alt || p.title, label: p.title }] : []),
      ...p.gallery.map((g) => ({ src: g.url, alt: g.alt || p.title, label: p.title })),
    ]),
    ...achievements.filter((a) => a.image_url).map((a) => ({ src: a.image_url, alt: a.image_alt || a.title, label: a.title })),
    ...(profile.avatar_url ? [{ src: profile.avatar_url, alt: profile.avatar_alt || name, label: name }] : []),
  ];
  const words = unique([...projects.map((p) => p.title), ...skills.map((s) => s.name), ...profile.interests]);
  const tiles: DomeTileData[] = images.length
    ? images
    : (words.length >= 4 ? words : FALLBACK_WORDS).map((w) => ({ src: null, alt: "", label: w }));

  const derivedTicker = unique([
    ...(profile.headline && !isPlaceholder(profile.headline) ? [profile.headline] : []),
    ...skills.map((s) => s.name),
    ...profile.interests,
  ]).slice(0, 14);
  const ticker = settings.ticker_items?.length
    ? settings.ticker_items
    : derivedTicker.length >= 3
      ? derivedTicker
      : FALLBACK_WORDS;

  const resumeUrl = settings.show_resume ? "/resume" : null;

  return (
    <div className="relative">
      <div className="relative">
        <Hero
          name={name}
          subtitle={subtitle}
          primaryLabel={uiLabel(settings.cta_primary_label, DEFAULT_SETTINGS.cta_primary_label, copy.homePage.ctaPrimary)}
          secondaryLabel={uiLabel(settings.cta_secondary_label, DEFAULT_SETTINGS.cta_secondary_label, copy.homePage.ctaSecondary)}
          scrollLabel={copy.homePage.scroll}
          ticker={ticker}
          tiles={tiles}
          animateDome={settings.enable_3d}
        />
        {settings.now_text?.trim() && <NowLine text={settings.now_text} label={copy.now.label} tashkent={copy.now.tashkent} />}
        <Projects projects={featured} labels={{ hint: copy.homePage.dragHint }} />
        <Highlights items={highlights} stats={stats} />
        <Skills skills={skills} />
        {github && <GithubActivity calendar={github} />}
        <Experience items={experience} resumeUrl={resumeUrl} />
        <Testimonials items={testimonials} />
        <Contact social={social} email={settings.contact_email} />
      </div>
    </div>
  );
}
