import type { NavItem, Profile, SiteSettings } from "./types";

/**
 * Fallback content used only when the database is unavailable or not yet
 * configured. Items in [square brackets] are placeholders, not facts — edit
 * the real values from the admin dashboard.
 */
export const DEFAULT_NAV: NavItem[] = [
  { label: "Men haqimda", href: "/about", visible: true },
  { label: "Loyihalar", href: "/projects", visible: true },
  { label: "Yutuqlar", href: "/achievements", visible: true },
  { label: "Ko‘nikmalar", href: "/skills", visible: true },
  { label: "Tajriba", href: "/experience", visible: true },
  { label: "Galereya", href: "/gallery", visible: true },
  { label: "Aloqa", href: "/contact", visible: true },
];

export const DEFAULT_PROFILE: Profile = {
  id: 1,
  full_name: "Behruz Ziyodullayev",
  headline: "[Kasbiy unvoningiz — admin paneldan tahrirlang]",
  short_intro: "[Qisqa tanishtiruv: o‘zingiz haqingizda 1–2 gap. Admin → Profil bo‘limidan tahrirlang.]",
  bio: "[Biografiya: admin paneldan to‘ldiring.]",
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
  accent_color: "#8b5cf6",
  enable_3d: true,
  enable_particles: true,
  hero_eyebrow: "Portfolio",
  hero_title: "",
  hero_description: "[Hero tavsifi: nima bilan shug‘ullanishingizni qisqacha yozing. Admin → Sozlamalar → Hero.]",
  cta_primary_label: "Loyihalarimni ko’rish",
  cta_secondary_label: "Men bilan bog’lanish",
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

export function seoDescription(settings: { seo_description: string }, name: string) {
  return settings.seo_description?.trim() || `${name} — shaxsiy portfolio: loyihalar, yutuqlar va tajriba.`;
}

export function footerText(settings: { footer_text: string }, name: string) {
  return settings.footer_text?.trim() || `© ${new Date().getFullYear()} ${name}. Barcha huquqlar himoyalangan.`;
}
