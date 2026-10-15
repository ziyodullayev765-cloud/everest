import type { FieldDef, FieldSection } from "./fields";

export interface ListColumn {
  name: string;
  label: string;
  kind?: "text" | "date" | "boolean" | "tags" | "image" | "level";
}

export interface ResourceConfig {
  key: string;
  table: string;
  label: string;
  singular: string;
  description: string;
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  searchFields: string[];
  /** Optional facet shown as a filter dropdown in the list view. */
  facet?: { name: string; label: string };
  sections: FieldSection[];
  columns: ListColumn[];
  /** Public URL for preview / "view live" links. */
  publicPath?: (row: Record<string, unknown>) => string | null;
  /** Paths to revalidate after a change. */
  revalidate: string[];
}

const statusSection = (extra: FieldDef[] = []): FieldSection => ({
  title: "Publishing",
  description: "Drafts are never visible on the public website.",
  fields: [{ name: "status", label: "Status", type: "status" }, ...extra],
});

export const ACHIEVEMENT_KINDS = [
  { value: "award", label: "Award" },
  { value: "competition", label: "Competition result" },
  { value: "certificate", label: "Certificate" },
  { value: "milestone", label: "Milestone" },
  { value: "other", label: "Other" },
];

export const RESOURCES: Record<string, ResourceConfig> = {
  projects: {
    key: "projects",
    table: "projects",
    label: "Projects",
    singular: "Project",
    description: "Case studies and work samples shown in the project gallery.",
    titleField: "title",
    subtitleField: "summary",
    imageField: "thumbnail_url",
    searchFields: ["title", "summary", "category", "tags", "technologies"],
    facet: { name: "category", label: "Category" },
    columns: [
      { name: "category", label: "Category" },
      { name: "featured", label: "Featured", kind: "boolean" },
      { name: "updated_at", label: "Updated", kind: "date" },
    ],
    publicPath: (r) => (r.slug ? `/projects/${r.slug}` : null),
    revalidate: ["/", "/projects", "/projects/[slug]"],
    sections: [
      {
        title: "Basics",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 160 },
          {
            name: "slug",
            label: "URL slug",
            type: "slug",
            from: "title",
            help: "Used in the shareable URL: /projects/your-slug",
          },
          {
            name: "summary",
            label: "Short summary",
            type: "textarea",
            max: 400,
            rows: 3,
            wide: true,
            help: "Shown on project cards.",
          },
          {
            name: "description",
            label: "Full description",
            type: "markdown",
            max: 20000,
            rows: 12,
            wide: true,
            help: "Supports **bold**, *italic*, [links](https://…), ## headings and - lists.",
          },
          { name: "role", label: "Your role", type: "text", max: 160 },
          { name: "category", label: "Category", type: "text", max: 80, placeholder: "e.g. Web app" },
          { name: "technologies", label: "Technologies", type: "tags", maxItems: 30 },
          { name: "tags", label: "Tags", type: "tags", maxItems: 20 },
          { name: "started_on", label: "Start date", type: "date" },
          { name: "completed_on", label: "Completion date", type: "date" },
        ],
      },
      {
        title: "Media",
        fields: [
          { name: "thumbnail_url", label: "Thumbnail", type: "image", altField: "thumbnail_alt", wide: true },
          { name: "thumbnail_alt", label: "Thumbnail alt text", type: "text", max: 300, wide: true },
          { name: "gallery", label: "Gallery images", type: "gallery", maxItems: 30, wide: true },
        ],
      },
      {
        title: "Links",
        fields: [
          { name: "live_url", label: "Live demo URL", type: "url" },
          { name: "source_url", label: "Source code URL", type: "url" },
        ],
      },
      {
        title: "SEO",
        description: "Optional. Falls back to the title and summary.",
        fields: [
          { name: "seo_title", label: "SEO title", type: "text", max: 120 },
          { name: "seo_description", label: "SEO description", type: "textarea", max: 320, rows: 3 },
        ],
      },
      statusSection([{ name: "featured", label: "Feature on the home page", type: "boolean" }]),
    ],
  },

  achievements: {
    key: "achievements",
    table: "achievements",
    label: "Achievements",
    singular: "Achievement",
    description: "Awards, competition results, certificates and milestones.",
    titleField: "title",
    subtitleField: "organization",
    imageField: "image_url",
    searchFields: ["title", "organization", "category", "description"],
    facet: { name: "kind", label: "Type" },
    columns: [
      { name: "kind", label: "Type" },
      { name: "achieved_on", label: "Date", kind: "date" },
      { name: "featured", label: "Featured", kind: "boolean" },
    ],
    publicPath: () => "/achievements",
    revalidate: ["/", "/achievements"],
    sections: [
      {
        title: "Details",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 200, wide: true },
          { name: "kind", label: "Type", type: "select", options: ACHIEVEMENT_KINDS },
          { name: "category", label: "Category", type: "text", max: 80, placeholder: "e.g. Programming" },
          { name: "organization", label: "Issuing organization", type: "text", max: 200 },
          { name: "achieved_on", label: "Date", type: "date" },
          { name: "description", label: "Description", type: "markdown", max: 6000, rows: 6, wide: true },
        ],
      },
      {
        title: "Evidence",
        fields: [
          { name: "image_url", label: "Image", type: "image", altField: "image_alt", wide: true },
          { name: "image_alt", label: "Image alt text", type: "text", max: 300, wide: true },
          { name: "certificate_url", label: "Certificate file (PDF or image)", type: "file", accept: "any" },
          { name: "credential_url", label: "Verification URL", type: "url" },
        ],
      },
      statusSection([{ name: "featured", label: "Feature on the home page", type: "boolean" }]),
    ],
  },

  skills: {
    key: "skills",
    table: "skills",
    label: "Skills",
    singular: "Skill",
    description: "Languages, tools and abilities. Levels are optional and only shown if you set them.",
    titleField: "name",
    subtitleField: "category",
    searchFields: ["name", "category", "description"],
    facet: { name: "category", label: "Category" },
    columns: [
      { name: "category", label: "Category" },
      { name: "level", label: "Level", kind: "level" },
      { name: "featured", label: "Featured", kind: "boolean" },
    ],
    publicPath: () => "/skills",
    revalidate: ["/", "/skills", "/about"],
    sections: [
      {
        title: "Skill",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, max: 80 },
          { name: "category", label: "Category", type: "text", max: 80, placeholder: "e.g. Programming languages" },
          {
            name: "level",
            label: "Level (0–100, optional)",
            type: "number",
            min: 0,
            max: 100,
            help: "Leave empty to hide the indicator. Only enter a value you can stand behind.",
          },
          { name: "level_label", label: "Level label (optional)", type: "text", max: 40, placeholder: "e.g. Intermediate" },
          { name: "description", label: "Short note", type: "textarea", max: 600, rows: 3, wide: true },
        ],
      },
      statusSection([{ name: "featured", label: "Show on the home page", type: "boolean" }]),
    ],
  },

  education: {
    key: "education",
    table: "education",
    label: "Education",
    singular: "Education entry",
    description: "Schools, courses and training programmes.",
    titleField: "institution",
    subtitleField: "program",
    imageField: "image_url",
    searchFields: ["institution", "program", "field", "description"],
    columns: [
      { name: "program", label: "Programme" },
      { name: "start_date", label: "Start", kind: "date" },
      { name: "is_current", label: "Current", kind: "boolean" },
    ],
    publicPath: () => "/experience",
    revalidate: ["/experience", "/about"],
    sections: [
      {
        title: "Details",
        fields: [
          { name: "institution", label: "Institution", type: "text", required: true, max: 200 },
          { name: "program", label: "Programme / course / degree", type: "text", max: 200 },
          { name: "field", label: "Field of study", type: "text", max: 200 },
          { name: "location", label: "Location", type: "text", max: 160 },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "end_date", label: "End date", type: "date" },
          { name: "is_current", label: "I currently study here", type: "boolean" },
          { name: "url", label: "Website", type: "url" },
          { name: "description", label: "Description", type: "markdown", max: 6000, rows: 6, wide: true },
          { name: "image_url", label: "Image / logo", type: "image", wide: true },
        ],
      },
      statusSection(),
    ],
  },

  experience: {
    key: "experience",
    table: "experience",
    label: "Experience",
    singular: "Experience entry",
    description: "Work, internships, volunteering and other milestones.",
    titleField: "role",
    subtitleField: "organization",
    imageField: "image_url",
    searchFields: ["organization", "role", "employment_type", "description"],
    facet: { name: "employment_type", label: "Type" },
    columns: [
      { name: "organization", label: "Organization" },
      { name: "start_date", label: "Start", kind: "date" },
      { name: "is_current", label: "Current", kind: "boolean" },
    ],
    publicPath: () => "/experience",
    revalidate: ["/experience", "/about"],
    sections: [
      {
        title: "Details",
        fields: [
          { name: "organization", label: "Organization", type: "text", required: true, max: 200 },
          { name: "role", label: "Role / title", type: "text", max: 200 },
          { name: "employment_type", label: "Type", type: "text", max: 80, placeholder: "e.g. Internship, Volunteer" },
          { name: "location", label: "Location", type: "text", max: 160 },
          { name: "start_date", label: "Start date", type: "date" },
          { name: "end_date", label: "End date", type: "date" },
          { name: "is_current", label: "I currently work here", type: "boolean" },
          { name: "url", label: "Website", type: "url" },
          { name: "description", label: "Description", type: "markdown", max: 6000, rows: 6, wide: true },
          { name: "highlights", label: "Highlights (one per line)", type: "list", maxItems: 12, wide: true },
          { name: "image_url", label: "Image / logo", type: "image", wide: true },
        ],
      },
      statusSection(),
    ],
  },

  social: {
    key: "social",
    table: "social_links",
    label: "Social links",
    singular: "Social link",
    description: "Profiles shown in the footer and on the contact page.",
    titleField: "platform",
    subtitleField: "url",
    searchFields: ["platform", "label", "url"],
    columns: [{ name: "url", label: "URL" }],
    revalidate: ["/", "/contact"],
    sections: [
      {
        title: "Link",
        fields: [
          {
            name: "platform",
            label: "Platform",
            type: "text",
            required: true,
            max: 40,
            placeholder: "GitHub, LinkedIn, Telegram, Instagram…",
            help: "Known names get a matching icon.",
          },
          { name: "label", label: "Display label (optional)", type: "text", max: 80, placeholder: "@username" },
          { name: "url", label: "URL", type: "url", required: true, wide: true },
        ],
      },
      statusSection(),
    ],
  },

  stats: {
    key: "stats",
    table: "stats",
    label: "Statistics",
    singular: "Statistic",
    description: "Numbers shown on the home page. Only publish figures that are true.",
    titleField: "label",
    subtitleField: "value",
    searchFields: ["label", "value", "description"],
    columns: [{ name: "value", label: "Value" }],
    revalidate: ["/"],
    sections: [
      {
        title: "Statistic",
        fields: [
          { name: "value", label: "Value", type: "text", required: true, max: 24, placeholder: "e.g. 12+" },
          { name: "label", label: "Label", type: "text", required: true, max: 80, placeholder: "e.g. Completed projects" },
          { name: "description", label: "Note (optional)", type: "text", max: 200, wide: true },
        ],
      },
      statusSection(),
    ],
  },
};

export type ResourceKey = keyof typeof RESOURCES;

export function getResource(key: string): ResourceConfig | null {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key) ? RESOURCES[key] : null;
}

export function resourceFields(r: ResourceConfig): FieldDef[] {
  return r.sections.flatMap((s) => s.fields);
}

// -----------------------------------------------------------------------------
// Singletons
// -----------------------------------------------------------------------------
export interface SingletonConfig {
  key: "profile" | "settings";
  table: "profiles" | "site_settings";
  label: string;
  sections: FieldSection[];
  revalidate: string[];
}

export const PROFILE_CONFIG: SingletonConfig = {
  key: "profile",
  table: "profiles",
  label: "Profile & About",
  revalidate: ["/", "/about"],
  sections: [
    {
      title: "Identity",
      fields: [
        { name: "full_name", label: "Full name", type: "text", required: true, max: 120 },
        { name: "headline", label: "Professional title", type: "text", max: 160 },
        { name: "location", label: "Location", type: "text", max: 160 },
        { name: "availability", label: "Availability", type: "text", max: 160, placeholder: "e.g. Open to internships" },
        { name: "short_intro", label: "Short introduction", type: "textarea", max: 600, rows: 3, wide: true },
      ],
    },
    {
      title: "Photo & CV",
      fields: [
        { name: "avatar_url", label: "Profile photo", type: "image", altField: "avatar_alt", wide: true },
        { name: "avatar_alt", label: "Photo alt text", type: "text", max: 300, wide: true },
        { name: "resume_url", label: "CV / résumé (PDF)", type: "file", accept: "document", wide: true },
      ],
    },
    {
      title: "About page",
      fields: [
        { name: "bio", label: "Biography", type: "markdown", max: 6000, rows: 6, wide: true },
        { name: "story", label: "Personal story", type: "markdown", max: 10000, rows: 8, wide: true },
        { name: "background", label: "Professional background", type: "markdown", max: 6000, rows: 5, wide: true },
        { name: "learning_journey", label: "Education & learning journey", type: "markdown", max: 6000, rows: 5, wide: true },
        { name: "goals", label: "Goals", type: "markdown", max: 4000, rows: 4, wide: true },
        { name: "interests", label: "Interests", type: "tags", maxItems: 20, wide: true },
      ],
    },
  ],
};

export const SETTINGS_CONFIG: SingletonConfig = {
  key: "settings",
  table: "site_settings",
  label: "Site settings",
  revalidate: ["/"],
  sections: [
    {
      title: "General",
      fields: [
        { name: "site_name", label: "Site name", type: "text", required: true, max: 120 },
        {
          name: "site_url",
          label: "Public site URL",
          type: "url",
          help: "Used for canonical URLs and the sitemap, e.g. https://shahruz.dev",
        },
        { name: "logo_url", label: "Logo", type: "image" },
        { name: "favicon_url", label: "Favicon (PNG or ICO)", type: "image" },
      ],
    },
    {
      title: "Hero",
      fields: [
        { name: "hero_eyebrow", label: "Eyebrow text", type: "text", max: 120 },
        { name: "hero_title", label: "Hero title", type: "text", max: 200 },
        { name: "hero_description", label: "Hero description", type: "textarea", max: 800, rows: 4, wide: true },
        { name: "cta_primary_label", label: "Primary button", type: "text", max: 60 },
        { name: "cta_secondary_label", label: "Secondary button", type: "text", max: 60 },
      ],
    },
    {
      title: "Appearance",
      fields: [
        { name: "accent_color", label: "Accent colour", type: "color", help: "Emerald (#10b981) by default." },
        { name: "enable_3d", label: "Show interactive 3D centrepiece", type: "boolean" },
        { name: "enable_particles", label: "Show ambient particles", type: "boolean" },
      ],
    },
    {
      title: "Contact details",
      fields: [
        { name: "contact_email", label: "Public email", type: "email" },
        { name: "contact_phone", label: "Phone", type: "text", max: 40 },
        { name: "contact_location", label: "Location", type: "text", max: 160 },
        { name: "contact_note", label: "Note on the contact page", type: "textarea", max: 600, rows: 3, wide: true },
      ],
    },
    {
      title: "SEO & sharing",
      fields: [
        { name: "seo_title", label: "Default page title", type: "text", max: 120 },
        { name: "seo_description", label: "Meta description", type: "textarea", max: 320, rows: 3, wide: true },
        { name: "seo_keywords", label: "Keywords", type: "tags", maxItems: 20, wide: true },
        { name: "og_image_url", label: "Social sharing image (1200×630)", type: "image", wide: true },
      ],
    },
    {
      title: "Navigation & footer",
      fields: [
        { name: "nav_items", label: "Header navigation", type: "links", maxItems: 12, wide: true },
        { name: "footer_links", label: "Footer links", type: "links", maxItems: 12, wide: true },
        { name: "footer_text", label: "Footer text", type: "textarea", max: 400, rows: 2, wide: true },
        { name: "show_resume", label: "Show “Download CV” button (when a CV is uploaded)", type: "boolean", wide: true },
      ],
    },
    {
      title: "Privacy policy",
      fields: [{ name: "privacy_policy", label: "Privacy policy text", type: "markdown", max: 30000, rows: 14, wide: true }],
    },
  ],
};

export function singletonFields(s: SingletonConfig): FieldDef[] {
  return s.sections.flatMap((sec) => sec.fields);
}
