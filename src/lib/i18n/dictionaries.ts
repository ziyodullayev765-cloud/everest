/**
 * Interface strings for the public site in English, Uzbek (Latin) and Russian.
 * Portfolio *content* (projects, achievements, …) comes from the database and
 * is shown as entered in the admin; these are only UI chrome strings.
 */
import { LEGACY_NAV_HREFS } from "@/lib/defaults";

export const LOCALES = ["en", "uz", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", uz: "O‘zbekcha", ru: "Русский" };
export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", uz: "UZ", ru: "RU" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

const en = {
  skipToContent: "Skip to content",
  menu: "Menu",
  closeMenu: "Close menu",
  home: "Home",
  downloadCv: "Download Resume / CV",
  previewBanner: "Preview mode — drafts are visible",
  exitPreview: "Exit",
  language: "Language",
  lightMode: "Light mode",
  darkMode: "Dark mode",
  playMusic: "Play music",
  pauseMusic: "Pause music",
  backToTop: "Back to top",

  /** Labels for the standard pages; custom menu items keep the text entered in the admin. */
  nav: {
    "/": "Home",
    "/gallery": "Journey",
    "/highlights": "Highlights",
    "/projects": "Projects",
    "/experience": "Experience",
    "/achievements": "Achievements",
    "/skills": "Skills",
    "/contact": "Contact",
    "/about": "About",
    "/privacy": "Privacy policy",
  } as Record<string, string>,

  dates: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    present: "Present",
  },

  homePage: {
    highlightsLead: "The results I am proudest of, and the numbers behind them.",
    nextPage: "Next page",
    scroll: "Scroll",
    selectedWork: "Selected work",
    dragHint: "Drag or swipe the cards — click one for the full story.",
    prev: "Previous",
    next: "Next",
    milestones: "Milestones",
    capabilities: "Capabilities",
    journeySoFar: "Journey so far",
    experience: "Experience",
    fullTimeline: "Full timeline",
    contact: "Contact",
    galleryEyebrow: "Gallery",
    photos: "photos",
    everyMoment: "Every moment",
    tapToOpen: "Tap any photo to open it.",
    domeLabel: "Photo dome — drag to rotate, click a photo to enlarge",
    close: "Close",
  },

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
    photoPlaceholder: "[Profile photo — upload it in the admin dashboard]",
  },

  projects: {
    title: "Projects",
    lead: "Things I have built and contributed to.",
    search: "Search projects",
    all: "All",
    grid: "Grid view",
    list: "List view",
    view: "View",
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
    open: "Open",
  },

  achievements: {
    title: "Achievements",
    lead: "Awards, results, certificates and milestones.",
    empty: "No achievements published yet.",
    newest: "Newest first",
    oldest: "Oldest first",
    certificate: "View certificate",
    verify: "Verification link",
    category: "Category",
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
    validation: {
      name: "Please enter your name (at least 2 characters)",
      nameLong: "Name is too long",
      email: "Please enter a valid email address",
      subjectLong: "Subject is too long",
      messageShort: "Message should be at least 10 characters",
      messageLong: "Message is too long (5000 characters max)",
    },
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

export type Copy = typeof en;

const uz: Copy = {
  skipToContent: "Asosiy kontentga o‘tish",
  menu: "Menyu",
  closeMenu: "Menyuni yopish",
  home: "Bosh sahifa",
  downloadCv: "Rezyume / CV yuklab olish",
  previewBanner: "Ko‘rib chiqish rejimi — qoralamalar ham ko‘rinmoqda",
  exitPreview: "Chiqish",
  language: "Til",
  lightMode: "Yorug‘ rejim",
  darkMode: "Qorong‘i rejim",
  playMusic: "Musiqani yoqish",
  pauseMusic: "Musiqani to‘xtatish",
  backToTop: "Yuqoriga",

  nav: {
    "/": "Bosh sahifa",
    "/gallery": "Yo‘l",
    "/highlights": "Yutuqlar",
    "/projects": "Loyihalar",
    "/experience": "Tajriba",
    "/achievements": "Mukofotlar",
    "/skills": "Ko‘nikmalar",
    "/contact": "Aloqa",
    "/about": "Men haqimda",
    "/privacy": "Maxfiylik siyosati",
  },

  dates: {
    months: ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"],
    present: "hozirgacha",
  },

  homePage: {
    highlightsLead: "Eng faxrlanadigan natijalarim va ularning ortidagi raqamlar.",
    nextPage: "Keyingi sahifa",
    scroll: "Pastga",
    selectedWork: "Tanlangan ishlar",
    dragHint: "Kartalarni suring — batafsil ko‘rish uchun birini bosing.",
    prev: "Oldingi",
    next: "Keyingi",
    milestones: "Muhim bosqichlar",
    capabilities: "Imkoniyatlar",
    journeySoFar: "Bosib o‘tilgan yo‘l",
    experience: "Tajriba",
    fullTimeline: "To‘liq tarix",
    contact: "Aloqa",
    galleryEyebrow: "Galereya",
    photos: "ta surat",
    everyMoment: "Barcha lahzalar",
    tapToOpen: "Kattalashtirish uchun suratni bosing.",
    domeLabel: "Suratlar gumbazi — aylantirish uchun suring, kattalashtirish uchun bosing",
    close: "Yopish",
  },

  sections: {
    featuredProjects: "Tanlangan loyihalar",
    featuredProjectsLead: "Eng muhim ishlarim — g‘oyadan tayyor mahsulotgacha.",
    allProjects: "Barcha loyihalar",
    recentAchievements: "Yutuqlar va bosqichlar",
    allAchievements: "Barcha yutuqlar",
    skills: "Ko‘nikmalar",
    allSkills: "Barcha ko‘nikmalar",
    contactTitle: "Loyiha boshlaymiz / Bog‘lanaylik",
    contactLead: "Loyiha hajmi va muddatini yozing — har bir xabarga javob beraman.",
  },

  about: {
    title: "Men haqimda",
    bio: "Biografiya",
    story: "Mening hikoyam",
    background: "Kasbiy tajriba",
    learning: "O‘rganish yo‘li",
    goals: "Maqsadlarim",
    interests: "Qiziqishlarim",
    skills: "Ko‘nikmalar",
    education: "Ta’lim",
    experience: "Tajriba",
    photoPlaceholder: "[Profil surati — admin paneldan yuklang]",
  },

  projects: {
    title: "Loyihalar",
    lead: "Men yaratgan va ishtirok etgan loyihalar.",
    search: "Loyihalarni qidirish",
    all: "Barchasi",
    grid: "To‘r ko‘rinishi",
    list: "Ro‘yxat ko‘rinishi",
    view: "Ko‘rinish",
    empty: "Hozircha e’lon qilingan loyihalar yo‘q.",
    noMatch: "Filtrga mos loyiha topilmadi.",
    live: "Jonli demo",
    source: "Manba kodi",
    details: "Batafsil",
    back: "Barcha loyihalar",
    role: "Rolim",
    technologies: "Texnologiyalar",
    timeline: "Muddat",
    category: "Kategoriya",
    gallery: "Galereya",
    featured: "Tanlangan",
    open: "Ochish",
  },

  achievements: {
    title: "Yutuqlar",
    lead: "Mukofotlar, natijalar, sertifikatlar va muhim bosqichlar.",
    empty: "Hozircha e’lon qilingan yutuqlar yo‘q.",
    newest: "Avval yangilari",
    oldest: "Avval eskilari",
    certificate: "Sertifikatni ko‘rish",
    verify: "Tasdiqlash havolasi",
    category: "Kategoriya",
    kinds: {
      award: "Mukofot",
      competition: "Musobaqa",
      certificate: "Sertifikat",
      milestone: "Muhim bosqich",
      other: "Boshqa",
    },
  },

  skills: {
    title: "Ko‘nikmalar va imkoniyatlar",
    lead: "Ishlatadigan dasturlash tillari, freymvorklar va vositalar.",
    empty: "Hozircha e’lon qilingan ko‘nikmalar yo‘q.",
    other: "Boshqa",
  },

  experience: {
    title: "Tajriba va ta’lim",
    lead: "Ish, o‘qish va ular orasidagi muhim bosqichlar.",
    work: "Tajriba",
    education: "Ta’lim",
    empty: "Hozircha ma’lumot qo‘shilmagan.",
  },

  gallery: {
    title: "Yo‘l",
    lead: "Muhandis va asoschi sifatida yo‘limni shakllantirgan tajribalar, insonlar, loyihalar va bosqichlar.",
    empty: "Galereya hozircha bo‘sh.",
    close: "Yopish",
    prev: "Oldingi",
    next: "Keyingi",
    open: "Kattalashtirish",
  },

  contact: {
    title: "Aloqa",
    lead: "Savol, g‘oya yoki hamkorlik bo‘yicha yozing.",
    name: "Ismingiz",
    email: "Elektron pochta",
    subject: "Mavzu (ixtiyoriy)",
    message: "Loyiha haqida / xabar",
    send: "Yuborish",
    sending: "Yuborilmoqda…",
    success: "Rahmat! Xabaringiz yuborildi — tez orada javob beraman.",
    errorGeneric: "Xabarni yuborib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.",
    errorRate: "Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.",
    errorConfig: "Aloqa formasi hozircha sozlanmagan. Quyidagi kontaktlardan foydalaning.",
    details: "Kontaktlar",
    social: "Ijtimoiy tarmoqlar",
    privacyNote: "Yuborish orqali maxfiylik siyosatiga rozilik bildirasiz.",
    validation: {
      name: "Ismingizni kiriting (kamida 2 belgi)",
      nameLong: "Ism juda uzun",
      email: "To‘g‘ri elektron pochta manzilini kiriting",
      subjectLong: "Mavzu juda uzun",
      messageShort: "Xabar kamida 10 belgidan iborat bo‘lsin",
      messageLong: "Xabar juda uzun (ko‘pi bilan 5000 belgi)",
    },
  },

  privacy: { title: "Maxfiylik siyosati", empty: "Maxfiylik siyosati hozircha qo‘shilmagan." },

  notFound: {
    title: "Sahifa topilmadi",
    lead: "Siz qidirgan sahifa mavjud emas yoki ko‘chirilgan.",
    home: "Bosh sahifaga qaytish",
  },
  error: {
    title: "Nimadir xato ketdi",
    lead: "Kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring.",
    retry: "Qayta urinish",
  },
};

const ru: Copy = {
  skipToContent: "Перейти к содержимому",
  menu: "Меню",
  closeMenu: "Закрыть меню",
  home: "Главная",
  downloadCv: "Скачать резюме / CV",
  previewBanner: "Режим предпросмотра — видны черновики",
  exitPreview: "Выйти",
  language: "Язык",
  lightMode: "Светлая тема",
  darkMode: "Тёмная тема",
  playMusic: "Включить музыку",
  pauseMusic: "Выключить музыку",
  backToTop: "Наверх",

  nav: {
    "/": "Главная",
    "/gallery": "Путь",
    "/highlights": "Главное",
    "/projects": "Проекты",
    "/experience": "Опыт",
    "/achievements": "Достижения",
    "/skills": "Навыки",
    "/contact": "Контакты",
    "/about": "Обо мне",
    "/privacy": "Конфиденциальность",
  },

  dates: {
    months: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    present: "по настоящее время",
  },

  homePage: {
    highlightsLead: "Результаты, которыми я горжусь больше всего, и цифры за ними.",
    nextPage: "Следующая страница",
    scroll: "Вниз",
    selectedWork: "Избранные работы",
    dragHint: "Листайте карточки — нажмите на любую, чтобы узнать подробнее.",
    prev: "Назад",
    next: "Вперёд",
    milestones: "Вехи",
    capabilities: "Возможности",
    journeySoFar: "Пройденный путь",
    experience: "Опыт",
    fullTimeline: "Вся хронология",
    contact: "Контакты",
    galleryEyebrow: "Галерея",
    photos: "фото",
    everyMoment: "Все моменты",
    tapToOpen: "Нажмите на фото, чтобы открыть его.",
    domeLabel: "Купол из фото — перетащите, чтобы вращать, нажмите, чтобы увеличить",
    close: "Закрыть",
  },

  sections: {
    featuredProjects: "Избранные проекты",
    featuredProjectsLead: "Главные работы — от идеи до готового продукта.",
    allProjects: "Все проекты",
    recentAchievements: "Достижения и вехи",
    allAchievements: "Все достижения",
    skills: "Навыки",
    allSkills: "Все навыки",
    contactTitle: "Начнём проект / На связи",
    contactLead: "Опишите задачу и сроки — я отвечаю на каждое сообщение.",
  },

  about: {
    title: "Обо мне",
    bio: "Биография",
    story: "Моя история",
    background: "Опыт",
    learning: "Путь обучения",
    goals: "Цели",
    interests: "Интересы",
    skills: "Навыки",
    education: "Образование",
    experience: "Опыт",
    photoPlaceholder: "[Фото профиля — загрузите его в админ-панели]",
  },

  projects: {
    title: "Проекты",
    lead: "То, что я создал и в чём участвовал.",
    search: "Поиск проектов",
    all: "Все",
    grid: "Сеткой",
    list: "Списком",
    view: "Вид",
    empty: "Опубликованных проектов пока нет.",
    noMatch: "Нет проектов по этим фильтрам.",
    live: "Демо",
    source: "Исходный код",
    details: "Подробнее",
    back: "Все проекты",
    role: "Роль",
    technologies: "Технологии",
    timeline: "Сроки",
    category: "Категория",
    gallery: "Галерея",
    featured: "Избранное",
    open: "Открыть",
  },

  achievements: {
    title: "Достижения",
    lead: "Награды, результаты, сертификаты и важные этапы.",
    empty: "Опубликованных достижений пока нет.",
    newest: "Сначала новые",
    oldest: "Сначала старые",
    certificate: "Открыть сертификат",
    verify: "Ссылка для проверки",
    category: "Категория",
    kinds: {
      award: "Награда",
      competition: "Соревнование",
      certificate: "Сертификат",
      milestone: "Важный этап",
      other: "Другое",
    },
  },

  skills: {
    title: "Навыки и возможности",
    lead: "Языки, фреймворки и инструменты, с которыми я работаю.",
    empty: "Опубликованных навыков пока нет.",
    other: "Другое",
  },

  experience: {
    title: "Опыт и образование",
    lead: "Работа, учёба и важные этапы между ними.",
    work: "Опыт",
    education: "Образование",
    empty: "Пока ничего не добавлено.",
  },

  gallery: {
    title: "Путь",
    lead: "Опыт, люди, проекты и события, которые сформировали мой путь инженера и основателя.",
    empty: "Галерея пока пуста.",
    close: "Закрыть",
    prev: "Назад",
    next: "Вперёд",
    open: "Увеличить",
  },

  contact: {
    title: "Контакты",
    lead: "Вопросы, идеи или сотрудничество — напишите мне.",
    name: "Имя",
    email: "Эл. почта",
    subject: "Тема (необязательно)",
    message: "О проекте / сообщение",
    send: "Отправить",
    sending: "Отправка…",
    success: "Спасибо! Сообщение отправлено — скоро отвечу.",
    errorGeneric: "Не удалось отправить сообщение. Попробуйте ещё раз чуть позже.",
    errorRate: "Слишком много попыток. Попробуйте через несколько минут.",
    errorConfig: "Форма связи пока не настроена. Используйте контакты ниже.",
    details: "Контакты",
    social: "Соцсети",
    privacyNote: "Отправляя сообщение, вы соглашаетесь с политикой конфиденциальности.",
    validation: {
      name: "Введите имя (минимум 2 символа)",
      nameLong: "Слишком длинное имя",
      email: "Введите корректный адрес эл. почты",
      subjectLong: "Слишком длинная тема",
      messageShort: "Сообщение должно содержать не менее 10 символов",
      messageLong: "Сообщение слишком длинное (не более 5000 символов)",
    },
  },

  privacy: { title: "Политика конфиденциальности", empty: "Политика конфиденциальности пока не добавлена." },

  notFound: {
    title: "Страница не найдена",
    lead: "Страница не существует или была перемещена.",
    home: "На главную",
  },
  error: {
    title: "Что-то пошло не так",
    lead: "Произошла непредвиденная ошибка. Попробуйте ещё раз.",
    retry: "Повторить",
  },
};

export const DICTIONARIES: Record<Locale, Copy> = { en, uz, ru };

/** "2024-03-01" → "Mar 2024" (in the given language). Date-only strings, no timezone drift. */
/** Menu items: standard pages use the translated label, custom ones keep their own. */
/** Translates standard menu labels and points old "/#section" links at their own pages. */
export function localizeNav<T extends { href: string; label: string }>(items: T[], c: Copy): T[] {
  return items.map((i) => {
    const href = LEGACY_NAV_HREFS[i.href] ?? i.href;
    return { ...i, href, label: c.nav[href] ?? i.label };
  });
}

export function monthYear(date: string | null | undefined, c: Copy): string {
  if (!date) return "";
  const m = /^(\d{4})-(\d{2})/.exec(date);
  return m ? `${c.dates.months[Number(m[2]) - 1]} ${m[1]}` : "";
}

export function fullDate(date: string | null | undefined, c: Copy): string {
  if (!date) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return m ? `${Number(m[3])} ${c.dates.months[Number(m[2]) - 1]} ${m[1]}` : "";
}

export function dateRange(start: string | null, end: string | null, current: boolean, c: Copy): string {
  const s = monthYear(start, c);
  const e = current ? c.dates.present : monthYear(end, c);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}
