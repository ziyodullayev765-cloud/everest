import type { NavItem, Profile, SiteSettings } from "./types";

/**
 * Fallback content used only when the database is unavailable or not yet
 * configured. Items in [square brackets] are placeholders, not facts — edit
 * the real values from the admin dashboard.
 */
export const DEFAULT_NAV: NavItem[] = [
  { label: "Journey", href: "/gallery", visible: true },
  { label: "Highlights", href: "/highlights", visible: true },
  { label: "Projects", href: "/projects", visible: true },
  { label: "Experience", href: "/experience", visible: true },
  { label: "Achievements", href: "/achievements", visible: true },
  { label: "Skills", href: "/skills", visible: true },
  { label: "Contact", href: "/contact", visible: true },
];

/** Old menu links that pointed at home-page sections, mapped to their own pages. */
export const LEGACY_NAV_HREFS: Record<string, string> = {
  "/#highlights": "/highlights",
  "/#projects": "/projects",
  "/#skills": "/skills",
  "/#experience": "/experience",
  "/#contact": "/contact",
};

export const DEFAULT_PROFILE: Profile = {
  id: 1,
  full_name: "Behruz Ziyodullayev",
  headline: "[Your title — edit it in Admin → Profile]",
  short_intro: "[A one or two sentence intro — edit it in Admin → Profile.]",
  bio: "[Your bio — fill it in from the admin dashboard.]",
  story: "",
  background: "",
  learning_journey: "",
  goals: "",
  interests: [],
  location: "",
  availability: "",
  avatar_url: null,
  avatar_alt: "",
  resume_url: null,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  site_name: "Portfolio",
  logo_url: null,
  favicon_url: null,
  accent_color: "#c5a059",
  enable_3d: true,
  enable_particles: true,
  github_username: "",
  hero_eyebrow: "Portfolio",
  hero_title: "",
  ticker_items: [],
  hero_description: "[Hero text: what you do, in one sentence. Admin → Settings → Hero.]",
  cta_primary_label: "Explore Projects",
  cta_secondary_label: "Start a Project",
  seo_title: "",
  seo_description: "",
  seo_keywords: [],
  og_image_url: null,
  site_url: null,
  contact_email: null,
  contact_phone: null,
  contact_location: null,
  contact_note: "",
  show_resume: true,
  footer_text: "",
  nav_items: DEFAULT_NAV,
  footer_links: [{ label: "Maxfiylik siyosati", href: "/privacy", visible: true }],
  privacy_policy: "",
  music_url: null,
  music_title: "",
};

/** True for seeded placeholder text such as "[Kasbiy unvon…]". */
export function isPlaceholder(text: string | null | undefined) {
  return !!text && /^\s*\[[\s\S]*\]\s*$/.test(text);
}

/** The owner's name comes from the profile; every other copy derives from it. */
export function ownerName(profile: { full_name?: string | null }, settings?: { site_name?: string | null }) {
  return profile.full_name?.trim() || settings?.site_name?.trim() || "Portfolio";
}

export function seoTitle(settings: { seo_title: string }, name: string) {
  return settings.seo_title?.trim() || `${name} — Portfolio`;
}

/** Page description for search engines and link previews: the SEO text, else the hero text, else a generic line. */
export function seoDescription(
  settings: { seo_description: string; hero_description?: string },
  name: string,
  profile?: { short_intro?: string },
) {
  const candidates = [settings.seo_description, settings.hero_description, profile?.short_intro];
  return (
    candidates.map((c) => c?.trim()).find((c) => c && !isPlaceholder(c)) ||
    `${name} — portfolio: projects, highlights and experience.`
  );
}

export function footerText(settings: { footer_text: string }, name: string, rights = "All rights reserved.") {
  return settings.footer_text?.trim() || `© ${new Date().getFullYear()} ${name}. ${rights}`;
}
