/**
 * Public interface labels (Uzbek, Latin script). Portfolio *content* lives in
 * the database and is edited from /admin; these are only UI chrome strings,
 * kept in one place so they are easy to adjust or translate.
 */
export const copy = {
  skipToContent: "Asosiy kontentga o‘tish",
  menu: "Menyu",
  closeMenu: "Menyuni yopish",
  home: "Bosh sahifa",
  downloadCv: "CV yuklab olish",
  previewBanner: "Ko‘rib chiqish rejimi — qoralamalar ham ko‘rinmoqda",
  exitPreview: "Chiqish",

  sections: {
    featuredProjects: "Tanlangan loyihalar",
    featuredProjectsLead: "Eng muhim ishlarim — g‘oyadan tayyor mahsulotgacha.",
    allProjects: "Barcha loyihalar",
    recentAchievements: "So‘nggi yutuqlar",
    allAchievements: "Barcha yutuqlar",
    skills: "Ko‘nikmalar",
    allSkills: "Barcha ko‘nikmalar",
    contactTitle: "Keling, birga ishlaymiz",
    contactLead: "Loyiha, hamkorlik yoki shunchaki savol — yozing, albatta javob beraman.",
  },

  about: {
    title: "Men haqimda",
    bio: "Biografiya",
    story: "Mening hikoyam",
    background: "Kasbiy tajriba",
    learning: "Ta’lim va o‘rganish yo‘li",
    goals: "Maqsadlarim",
    interests: "Qiziqishlarim",
    skills: "Ko‘nikmalar",
    education: "Ta’lim",
    experience: "Tajriba",
  },

  projects: {
    title: "Loyihalar",
    lead: "Men yaratgan va ishtirok etgan loyihalar.",
    search: "Loyihalarni qidirish",
    all: "Barchasi",
    grid: "To‘r ko‘rinishi",
    list: "Ro‘yxat ko‘rinishi",
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
  },

  achievements: {
    title: "Yutuqlar",
    lead: "Mukofotlar, musobaqa natijalari, sertifikatlar va muhim bosqichlar.",
    empty: "Hozircha e’lon qilingan yutuqlar yo‘q.",
    newest: "Avval yangilari",
    oldest: "Avval eskilari",
    certificate: "Sertifikatni ko‘rish",
    verify: "Tasdiqlash havolasi",
    kinds: {
      award: "Mukofot",
      competition: "Musobaqa",
      certificate: "Sertifikat",
      milestone: "Muhim bosqich",
      other: "Boshqa",
    } as Record<string, string>,
  },

  skills: {
    title: "Ko‘nikmalar",
    lead: "Dasturlash tillari, dizayn, vositalar va boshqa qobiliyatlar.",
    empty: "Hozircha e’lon qilingan ko‘nikmalar yo‘q.",
    other: "Boshqa",
  },

  experience: {
    title: "Tajriba va ta’lim",
    lead: "O‘qish, kurslar, ish tajribasi va muhim bosqichlar.",
    work: "Tajriba",
    education: "Ta’lim",
    empty: "Hozircha ma’lumot qo‘shilmagan.",
  },

  gallery: {
    title: "Galereya",
    lead: "Suratlar, dizayn ishlari va boshqa lavhalar.",
    empty: "Galereya hozircha bo‘sh.",
    close: "Yopish",
    prev: "Oldingi",
    next: "Keyingi",
    open: "Kattalashtirish",
  },

  contact: {
    title: "Aloqa",
    lead: "Savol, taklif yoki hamkorlik bo‘yicha yozing.",
    name: "Ismingiz",
    email: "Elektron pochta",
    subject: "Mavzu (ixtiyoriy)",
    message: "Xabar",
    send: "Yuborish",
    sending: "Yuborilmoqda…",
    success: "Rahmat! Xabaringiz yuborildi — tez orada javob beraman.",
    errorGeneric: "Xabarni yuborib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.",
    errorRate: "Juda ko‘p urinish. Iltimos, birozdan so‘ng qayta urinib ko‘ring.",
    errorConfig: "Aloqa formasi hozircha sozlanmagan. Iltimos, quyidagi kontaktlardan foydalaning.",
    details: "Kontaktlar",
    social: "Ijtimoiy tarmoqlar",
    privacyNote: "Yuborish orqali siz maxfiylik siyosatiga rozilik bildirasiz.",
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
