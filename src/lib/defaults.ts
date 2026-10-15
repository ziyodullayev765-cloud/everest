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
  full_name: "Shahruz Ziyodullayev",
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
  avatar_alt: "Shahruz Ziyodullayev portreti",
  resume_url: null,
};

export const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  site_name: "Shahruz Ziyodullayev",
  logo_url: null,
  favicon_url: null,
  accent_color: "#10b981",
  enable_3d: true,
  enable_particles: true,
  hero_eyebrow: "Portfolio",
  hero_title: "Shahruz Ziyodullayev",
  hero_description: "[Hero tavsifi: nima bilan shug‘ullanishingizni qisqacha yozing. Admin → Sozlamalar → Hero.]",
  cta_primary_label: "Loyihalarimni ko’rish",
  cta_secondary_label: "Men bilan bog’lanish",
  seo_title: "Shahruz Ziyodullayev — Portfolio",
  seo_description: "Shahruz Ziyodullayevning shaxsiy portfoliosi: loyihalar, yutuqlar va tajriba.",
  seo_keywords: [],
  og_image_url: null,
  site_url: null,
  contact_email: null,
  contact_phone: null,
  contact_location: null,
  contact_note: "",
  show_resume: true,
  footer_text: "© Shahruz Ziyodullayev. Barcha huquqlar himoyalangan.",
  nav_items: DEFAULT_NAV,
  footer_links: [{ label: "Maxfiylik siyosati", href: "/privacy", visible: true }],
  privacy_policy: "",
};

/** True for seeded placeholder text such as "[Kasbiy unvon…]". */
export function isPlaceholder(text: string | null | undefined) {
  return !!text && /^\s*\[[\s\S]*\]\s*$/.test(text);
}
