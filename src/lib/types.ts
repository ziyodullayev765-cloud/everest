export type PublishStatus = "draft" | "published";
export type MessageStatus = "new" | "read" | "archived";

export interface NavItem {
  label: string;
  href: string;
  visible: boolean;
}

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface Profile {
  id: number;
  full_name: string;
  headline: string;
  short_intro: string;
  bio: string;
  story: string;
  background: string;
  learning_journey: string;
  goals: string;
  interests: string[];
  location: string;
  availability: string;
  avatar_url: string | null;
  avatar_alt: string;
  resume_url: string | null;
  updated_at?: string;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  accent_color: string;
  enable_3d: boolean;
  enable_particles: boolean;
  github_username: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_description: string;
  ticker_items: string[];
  cta_primary_label: string;
  cta_secondary_label: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  og_image_url: string | null;
  site_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_location: string | null;
  contact_note: string;
  show_resume: boolean;
  footer_text: string;
  nav_items: NavItem[];
  footer_links: NavItem[];
  privacy_policy: string;
  music_url: string | null;
  music_title: string;
  updated_at?: string;
}

interface Row {
  id: string;
  status: PublishStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Project extends Row {
  slug: string;
  title: string;
  summary: string;
  description: string;
  role: string;
  category: string;
  tags: string[];
  technologies: string[];
  thumbnail_url: string | null;
  thumbnail_alt: string;
  gallery: GalleryImage[];
  live_url: string | null;
  source_url: string | null;
  started_on: string | null;
  completed_on: string | null;
  featured: boolean;
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  problem: string;
  solution: string;
  architecture: string;
  results: string;
  /** "value | label" lines. */
  metrics: string[];
  demo_url: string | null;
  stage: "in_progress" | "completed" | "live" | null;
  demo_kind: "browser" | "phone";
}

export interface Post extends Row {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  cover_alt: string;
  tags: string[];
  featured: boolean;
  published_at: string | null;
  seo_title: string;
  seo_description: string;
}

export interface Testimonial extends Row {
  quote: string;
  name: string;
  role: string;
  organization: string;
  avatar_url: string | null;
  url: string | null;
}

export type AchievementKind = "award" | "competition" | "certificate" | "milestone" | "other";

export interface Achievement extends Row {
  title: string;
  description: string;
  kind: AchievementKind;
  category: string;
  organization: string;
  achieved_on: string | null;
  image_url: string | null;
  image_alt: string;
  certificate_url: string | null;
  credential_url: string | null;
  featured: boolean;
}

export interface Skill extends Row {
  name: string;
  category: string;
  level: number | null;
  level_label: string;
  description: string;
  featured: boolean;
}

export interface Education extends Row {
  institution: string;
  program: string;
  field: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string;
  image_url: string | null;
  url: string | null;
}

export interface Experience extends Row {
  organization: string;
  role: string;
  employment_type: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  period_label: string;
  description: string;
  highlights: string[];
  image_url: string | null;
  url: string | null;
}

export interface Media extends Row {
  bucket: string;
  path: string;
  url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: "image" | "document" | "audio";
  width: number | null;
  height: number | null;
  alt_text: string;
  caption: string;
  category: string;
  in_gallery: boolean;
}

export interface SocialLink extends Row {
  platform: string;
  label: string;
  url: string;
}

export interface Stat extends Row {
  label: string;
  value: string;
  description: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  created_at: string;
}

export interface ActivityEntry {
  id: number;
  entity: string;
  entity_id: string | null;
  action: "create" | "update" | "delete";
  title: string | null;
  created_at: string;
}

export type ActionResult<T = undefined> =
  { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
