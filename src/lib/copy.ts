/**
 * Public interface labels (English). Portfolio *content* lives in the database
 * and is edited from /admin; these are only UI chrome strings, kept in one
 * place so they are easy to adjust or translate.
 */
export const copy = {
  skipToContent: "Skip to content",
  menu: "Menu",
  closeMenu: "Close menu",
  home: "Home",
  downloadCv: "Download Resume / CV",
  previewBanner: "Preview mode — drafts are visible",
  exitPreview: "Exit",

  sections: {
    featuredProjects: "Featured Projects",
    featuredProjectsLead: "Selected work — from first idea to shipped product.",
    allProjects: "All projects",
    recentAchievements: "Highlights & Milestones",
    allAchievements: "All achievements",
    skills: "Skills",
    allSkills: "All skills",
    contactTitle: "Start a Project / Let’s Connect",
    contactLead: "Share the scope and timeline — I reply to every message.",
  },

  about: {
    title: "About",
    bio: "Bio",
    story: "My story",
    background: "Background",
    learning: "Learning journey",
    goals: "Goals",
    interests: "Interests",
    skills: "Skills",
    education: "Education",
    experience: "Experience",
  },

  projects: {
    title: "Projects",
    lead: "Things I have built and contributed to.",
    search: "Search projects",
    all: "All",
    grid: "Grid view",
    list: "List view",
    empty: "No projects published yet.",
    noMatch: "No projects match these filters.",
    live: "Live demo",
    source: "Source code",
    details: "Details",
    back: "All projects",
    role: "Role",
    technologies: "Technologies",
    timeline: "Timeline",
    category: "Category",
    gallery: "Gallery",
    featured: "Featured",
  },

  achievements: {
    title: "Achievements",
    lead: "Awards, results, certificates and milestones.",
    empty: "No achievements published yet.",
    newest: "Newest first",
    oldest: "Oldest first",
    certificate: "View certificate",
    verify: "Verification link",
    kinds: {
      award: "Award",
      competition: "Competition",
      certificate: "Certificate",
      milestone: "Milestone",
      other: "Other",
    } as Record<string, string>,
  },

  skills: {
    title: "Skills & Capabilities",
    lead: "Languages, frameworks and tools I use to ship.",
    empty: "No skills published yet.",
    other: "Other",
  },

  experience: {
    title: "Experience & Education",
    lead: "Work, study and the milestones in between.",
    work: "Experience",
    education: "Education",
    empty: "Nothing added yet.",
  },

  gallery: {
    title: "Journey",
    lead: "The experiences, people, projects and milestones that have shaped my journey as an engineer and founder.",
    empty: "The gallery is empty for now.",
    close: "Close",
    prev: "Previous",
    next: "Next",
    open: "Enlarge",
  },

  contact: {
    title: "Contact",
    lead: "Questions, ideas or collaborations — write to me.",
    name: "Name",
    email: "Email",
    subject: "Subject (optional)",
    message: "Project scope / message",
    send: "Send message",
    sending: "Sending…",
    success: "Thank you! Your message is on its way — I’ll reply soon.",
    errorGeneric: "The message could not be sent. Please try again in a moment.",
    errorRate: "Too many attempts. Please try again in a few minutes.",
    errorConfig: "The contact form isn’t set up yet. Please use the details below.",
    details: "Details",
    social: "Elsewhere",
    privacyNote: "By sending you agree to the privacy policy.",
  },

  privacy: { title: "Privacy policy", empty: "No privacy policy has been added yet." },

  notFound: {
    title: "Page not found",
    lead: "The page you’re looking for doesn’t exist or has moved.",
    home: "Back to home",
  },
  error: {
    title: "Something went wrong",
    lead: "An unexpected error occurred. Please try again.",
    retry: "Try again",
  },
};
