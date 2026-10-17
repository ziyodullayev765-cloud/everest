import type { FieldDef, FieldSection } from "./fields";
import { TRANSLATABLE } from "@/lib/i18n/content";

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
          {
            name: "stage",
            label: "Stage",
            type: "select",
            options: [
              { value: "", label: "— not shown —" },
              { value: "in_progress", label: "In progress" },
              { value: "completed", label: "Completed" },
              { value: "live", label: "Live" },
            ],
            help: "Shown as a small badge next to the project.",
          },
          { name: "technologies", label: "Technologies", type: "tags", maxItems: 30 },
          { name: "tags", label: "Tags", type: "tags", maxItems: 20 },
          { name: "started_on", label: "Start date", type: "date" },
          { name: "completed_on", label: "Completion date", type: "date" },
        ],
      },
      {
        title: "Media",
        fields: [
          {
            name: "thumbnail_url",
            label: "Card image",
            type: "image",
            altField: "thumbnail_alt",
            wide: true,
            help: "Shown on the project's card on the home page and in the projects list. Without it, the first gallery image is used.",
          },
          { name: "thumbnail_alt", label: "Card image alt text", type: "text", max: 300, wide: true },
          { name: "gallery", label: "Gallery images", type: "gallery", maxItems: 30, wide: true },
        ],
      },
      {
        title: "Case study",
        description:
          "Optional. Filled-in steps appear on the project page as an interactive Problem → Solution → Architecture → Results story.",
        fields: [
          {
            name: "problem",
            label: "Problem",
            type: "markdown",
            max: 6000,
            rows: 4,
            wide: true,
            help: "What was wrong or missing?",
          },
          { name: "solution", label: "Solution", type: "markdown", max: 6000, rows: 4, wide: true, help: "What did you build?" },
          {
            name: "architecture",
            label: "Architecture",
            type: "markdown",
            max: 6000,
            rows: 4,
            wide: true,
            help: "How is it built? Stack, data flow, important decisions.",
          },
          {
            name: "results",
            label: "Results",
            type: "markdown",
            max: 6000,
            rows: 4,
            wide: true,
            help: "What changed after launch?",
          },
          {
            name: "metrics",
            label: "Key numbers (one per line: value | label)",
            type: "list",
            maxItems: 8,
            wide: true,
            help: "e.g. 1200 | monthly users. Only real numbers.",
          },
        ],
      },
      {
        title: "Interactive demo",
        description:
          "Optional. Visitors can try the project right on its page. Paste a link that allows embedding: your own app, a Figma prototype, a YouTube/Vimeo video, CodeSandbox, StackBlitz…",
        fields: [
          { name: "demo_url", label: "Demo link (https://…)", type: "url", wide: true },
          {
            name: "demo_kind",
            label: "Frame",
            type: "select",
            options: [
              { value: "browser", label: "Browser window (web apps, videos)" },
              { value: "phone", label: "Phone (iOS / mobile apps)" },
            ],
          },
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
          {
            name: "period_label",
            label: "Period text (optional)",
            type: "text",
            max: 60,
            placeholder: "e.g. 2026",
            help: "Shown instead of the dates when filled in.",
          },
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
  posts: {
    key: "posts",
    table: "posts",
    label: "Blog",
    singular: "Post",
    description: "Short technical articles: what you built, learned and how.",
    titleField: "title",
    subtitleField: "excerpt",
    imageField: "cover_url",
    searchFields: ["title", "excerpt", "body", "tags"],
    columns: [
      { name: "tags", label: "Tags", kind: "tags" },
      { name: "published_at", label: "Published", kind: "date" },
    ],
    publicPath: (r) => (r.slug ? `/blog/${r.slug}` : null),
    revalidate: ["/", "/blog", "/blog/[slug]"],
    sections: [
      {
        title: "Article",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, max: 200, wide: true },
          { name: "slug", label: "URL slug", type: "slug", from: "title", help: "Used in the URL: /blog/your-slug" },
          { name: "tags", label: "Tags", type: "tags", maxItems: 12 },
          {
            name: "excerpt",
            label: "Excerpt",
            type: "textarea",
            max: 400,
            rows: 3,
            wide: true,
            help: "One or two sentences shown in the list.",
          },
          {
            name: "body",
            label: "Article text",
            type: "markdown",
            max: 50000,
            rows: 18,
            wide: true,
            help: "Supports **bold**, *italic*, [links](https://…), ## headings, - lists and `code`.",
          },
        ],
      },
      {
        title: "Cover",
        fields: [
          { name: "cover_url", label: "Cover image", type: "image", altField: "cover_alt", wide: true },
          { name: "cover_alt", label: "Cover alt text", type: "text", max: 300, wide: true },
        ],
      },
      {
        title: "SEO",
        description: "Optional. Falls back to the title and excerpt.",
        fields: [
          { name: "seo_title", label: "SEO title", type: "text", max: 120 },
          { name: "seo_description", label: "SEO description", type: "textarea", max: 320, rows: 3 },
        ],
      },
      statusSection([{ name: "featured", label: "Pin to the top", type: "boolean" }]),
    ],
  },

  testimonials: {
    key: "testimonials",
    table: "testimonials",
    label: "Testimonials",
    singular: "Testimonial",
    description: "Words from mentors, teammates or clients. Only publish real quotes, with permission.",
    titleField: "name",
    subtitleField: "quote",
    imageField: "avatar_url",
    searchFields: ["name", "quote", "role", "organization"],
    columns: [{ name: "organization", label: "Organization" }],
    publicPath: () => "/",
    revalidate: ["/", "/about"],
    sections: [
      {
        title: "Testimonial",
        fields: [
          { name: "quote", label: "Quote", type: "textarea", required: true, max: 800, rows: 5, wide: true },
          { name: "name", label: "Person", type: "text", required: true, max: 120 },
          { name: "role", label: "Role", type: "text", max: 160, placeholder: "e.g. Teacher" },
          { name: "organization", label: "Organization", type: "text", max: 160 },
          { name: "url", label: "Profile link (optional)", type: "url" },
          { name: "avatar_url", label: "Photo (optional)", type: "image", wide: true },
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

/** "Translations" form section for any table with translatable columns. */
function translationsSection(table: string): FieldSection[] {
  if (!TRANSLATABLE[table]) return [];
  return [
    {
      title: "Translations",
      description:
        "Uzbek and Russian versions of the text above, shown to visitors who pick that language. Leave a field empty to show the main text instead.",
      fields: [{ name: "translations", label: "O‘zbekcha / Русский", type: "translations", table, wide: true }],
    },
  ];
}

export function resourceFields(r: ResourceConfig): FieldDef[] {
  return r.sections.flatMap((s) => s.fields);
}

for (const r of Object.values(RESOURCES)) r.sections.push(...translationsSection(r.table));

// -----------------------------------------------------------------------------
// Singletons
// -----------------------------------------------------------------------------
export type SingletonKey = "profile" | "settings" | "music";

export interface SingletonConfig {
  key: SingletonKey;
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
        {
          name: "site_name",
          label: "Site name (fallback)",
          type: "text",
          required: true,
          max: 120,
          help: "Your name is taken from Profile → Full name. This is only used if that is empty.",
        },
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
        { name: "hero_title", label: "Hero title (optional)", type: "text", max: 200, help: "Leave empty to show your name." },
        { name: "hero_description", label: "Hero description", type: "textarea", max: 800, rows: 4, wide: true },
        {
          name: "ticker_items",
          label: "Ticker words (under the hero)",
          type: "tags",
          maxItems: 24,
          wide: true,
          help: "Shown in the thin scrolling line under the hero. Empty = skills and interests.",
        },
        { name: "cta_primary_label", label: "Primary button", type: "text", max: 60 },
        { name: "cta_secondary_label", label: "Secondary button", type: "text", max: 60 },
      ],
    },
    {
      title: "Appearance",
      fields: [
        {
          name: "accent_color",
          label: "Accent colour",
          type: "color",
          help: "Main colour of buttons and highlights (bronze #c5a059 by default).",
        },
        { name: "enable_3d", label: "Let the 3D image dome drift on its own", type: "boolean" },
        { name: "enable_particles", label: "Ambient particles (unused by the current design)", type: "boolean" },
        {
          name: "github_username",
          label: "GitHub username (activity graph)",
          type: "text",
          max: 39,
          placeholder: "e.g. ziyodullayev765-cloud",
          help: "Shows your public GitHub activity on the home page. Leave empty to hide it.",
        },
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
        {
          name: "seo_title",
          label: "Default page title (optional)",
          type: "text",
          max: 120,
          help: "Empty = “Your Name — Portfolio”.",
        },
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
        {
          name: "footer_text",
          label: "Footer text (optional)",
          type: "textarea",
          max: 400,
          rows: 2,
          wide: true,
          help: "Empty = “© year Your Name”.",
        },
        {
          name: "show_resume",
          label: "Show “Download CV” button (your uploaded PDF, or one generated automatically from the site)",
          type: "boolean",
          wide: true,
        },
      ],
    },
    {
      title: "Privacy policy",
      fields: [{ name: "privacy_policy", label: "Privacy policy text", type: "markdown", max: 30000, rows: 14, wide: true }],
    },
    {
      title: "Now & Uses",
      description:
        "“Now” is a one-line status on the home page (e.g. “Building Yo‘lda, learning SwiftUI”). “Uses” fills the /uses page with the tools and setup you work with. Leave either empty to hide it.",
      fields: [
        {
          name: "now_text",
          label: "Now (one line)",
          type: "text",
          max: 300,
          wide: true,
          placeholder: "Building Yo‘lda · learning SwiftUI",
        },
        {
          name: "uses_text",
          label: "Uses page",
          type: "markdown",
          max: 20000,
          rows: 12,
          wide: true,
          help: "Use ## headings for groups (## Hardware, ## Software) and - lists for the items.",
        },
      ],
    },
  ],
};

/** Background music has its own admin page; it is stored on the site settings row. */
export const MUSIC_CONFIG: SingletonConfig = {
  key: "music",
  table: "site_settings",
  label: "Music",
  revalidate: ["/"],
  sections: [
    {
      title: "Background music",
      description:
        "Visitors can switch the music on with the music button in the bottom-left corner of the site. Nothing plays until they press it, and the button only appears once a track is uploaded. Only use music you have the rights to.",
      fields: [
        { name: "music_url", label: "Music file (MP3, M4A, OGG, WAV — max 15 MB)", type: "file", accept: "audio", wide: true },
        { name: "music_title", label: "Track name (shown on the music button)", type: "text", max: 120, wide: true },
      ],
    },
  ],
};

PROFILE_CONFIG.sections.push(...translationsSection("profiles"));
SETTINGS_CONFIG.sections.push(...translationsSection("site_settings"));

export function getSingleton(key: string): SingletonConfig | null {
  return key === "profile" ? PROFILE_CONFIG : key === "settings" ? SETTINGS_CONFIG : key === "music" ? MUSIC_CONFIG : null;
}

export function singletonFields(s: SingletonConfig): FieldDef[] {
  return s.sections.flatMap((sec) => sec.fields);
}
