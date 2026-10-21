import type { Dictionary } from "./uz";
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Russian overlay — partial; untranslated keys fall back to Uzbek. Enable in Admin → Settings → Languages. */
export const ru: DeepPartial<Dictionary> = {
  nav: { home: "Главная", assignments: "Задания", quizzes: "Квизы", results: "Результаты", profile: "Профиль" },
};
