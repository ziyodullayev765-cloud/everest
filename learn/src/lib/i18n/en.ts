import type { Dictionary } from "./uz";
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** English overlay — partial; untranslated keys fall back to Uzbek. Enable in Admin → Settings → Languages. */
export const en: DeepPartial<Dictionary> = {
  nav: { home: "Home", assignments: "Assignments", quizzes: "Quizzes", results: "Results", profile: "Profile" },
};
