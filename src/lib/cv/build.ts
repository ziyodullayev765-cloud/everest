import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { DICTIONARIES, monthYear, type Locale } from "@/lib/i18n/dictionaries";
import type { Achievement, Education, Experience, Profile, Project, Skill, SocialLink } from "@/lib/types";

export interface CvInput {
  locale: Locale;
  name: string;
  profile: Profile;
  email: string | null;
  siteUrl: string;
  social: SocialLink[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  achievements: Achievement[];
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    about: "About",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    achievements: "Achievements",
    present: "Present",
    generated: "Generated from",
  },
  uz: {
    about: "Men haqimda",
    experience: "Tajriba",
    education: "Ta’lim",
    projects: "Loyihalar",
    skills: "Ko‘nikmalar",
    achievements: "Yutuqlar",
    present: "Hozirgacha",
    generated: "Manba:",
  },
  ru: {
    about: "Обо мне",
    experience: "Опыт",
    education: "Образование",
    projects: "Проекты",
    skills: "Навыки",
    achievements: "Достижения",
    present: "Настоящее время",
    generated: "Источник:",
  },
};

const FONT_DIR = path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");

/** Plain text from the admin's light Markdown, with glyphs the font lacks swapped for close ones. */
export function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/ʻ/g, "‘")
    .replace(/ʼ/g, "’")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function ym(date: string | null, locale: Locale): string {
  return monthYear(date, DICTIONARIES[locale]);
}

function range(start: string | null, end: string | null, current: boolean, locale: Locale) {
  const s = ym(start, locale);
  const e = current ? LABELS[locale].present! : ym(end, locale);
  return s && e ? `${s} – ${e}` : s || e;
}

const A4: [number, number] = [595.28, 841.89];
const M = 48;
const INK = rgb(0.1, 0.1, 0.11);
const MUTED = rgb(0.42, 0.42, 0.45);
const TINT = rgb(0.6, 0.31, 0.24);

class Writer {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private reg: PDFFont,
    private bold: PDFFont,
  ) {
    this.page = doc.addPage(A4);
    this.y = A4[1] - M;
  }
  get width() {
    return A4[0] - M * 2;
  }
  ensure(h: number) {
    if (this.y - h < M) {
      this.page = this.doc.addPage(A4);
      this.y = A4[1] - M;
    }
  }
  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      const words = para.split(" ");
      let line = "";
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
        else {
          out.push(line);
          line = w;
        }
      }
      out.push(line);
    }
    return out;
  }
  text(t: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.reg;
    const indent = opts.indent ?? 0;
    const lh = size * 1.4;
    for (const line of this.wrap(t, font, size, this.width - indent)) {
      this.ensure(lh);
      this.page.drawText(line, { x: M + indent, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= lh;
    }
    this.y -= opts.gap ?? 0;
  }
  /** Bold title on the left, muted date on the right. */
  row(left: string, right: string) {
    const size = 11;
    const rw = right ? this.reg.widthOfTextAtSize(right, 9) : 0;
    const lines = this.wrap(left, this.bold, size, this.width - rw - 12);
    this.ensure(lines.length * size * 1.4);
    if (right) this.page.drawText(right, { x: M + this.width - rw, y: this.y - size, size: 9, font: this.reg, color: MUTED });
    for (const l of lines) {
      this.page.drawText(l, { x: M, y: this.y - size, size, font: this.bold, color: INK });
      this.y -= size * 1.4;
    }
  }
  heading(t: string) {
    this.ensure(40);
    this.y -= 14;
    this.page.drawText(t.toUpperCase(), { x: M, y: this.y - 9, size: 9, font: this.bold, color: TINT });
    this.y -= 15;
    this.page.drawLine({
      start: { x: M, y: this.y },
      end: { x: M + this.width, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.86),
    });
    this.y -= 10;
  }
}

/** Builds a one-or-more page A4 CV from the published portfolio content. */
export async function buildCv(input: CvInput): Promise<Uint8Array> {
  const L = LABELS[input.locale];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regBytes, boldBytes] = await Promise.all([
    readFile(path.join(FONT_DIR, "Geist-Regular.ttf")),
    readFile(path.join(FONT_DIR, "Geist-SemiBold.ttf")),
  ]);
  const reg = await doc.embedFont(regBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  doc.setTitle(`${input.name} — CV`);
  doc.setAuthor(input.name);
  doc.setCreator(input.siteUrl);
  doc.setLanguage(input.locale);

  const w = new Writer(doc, reg, bold);
  const p = input.profile;
  w.text(plain(input.name), { size: 26, bold: true, gap: 2 });
  if (p.headline) w.text(plain(p.headline), { size: 12, color: TINT, gap: 4 });
  const contact = [input.email, p.location && plain(p.location), input.siteUrl.replace(/^https?:\/\//, "")]
    .filter(Boolean)
    .join("   ·   ");
  w.text(contact, { size: 9, color: MUTED });
  const links = input.social
    .map((s) => s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))
    .filter((u) => !u.startsWith("mailto:") && !u.startsWith("tel:"))
    .slice(0, 5);
  if (links.length) w.text(links.join("   ·   "), { size: 9, color: MUTED });

  const about = plain(p.short_intro || p.bio || "");
  if (about) {
    w.heading(L.about!);
    w.text(about, { size: 10, color: rgb(0.2, 0.2, 0.22) });
  }

  if (input.experience.length) {
    w.heading(L.experience!);
    for (const e of input.experience) {
      w.row(
        plain([e.role, e.organization].filter(Boolean).join(" — ")),
        e.period_label || range(e.start_date, e.end_date, e.is_current, input.locale),
      );
      const sub = [e.employment_type, e.location].filter(Boolean).map(plain).join(" · ");
      if (sub) w.text(sub, { size: 9, color: MUTED });
      const desc = plain(e.description);
      if (desc) w.text(desc, { size: 9.5, gap: 1 });
      for (const h of e.highlights ?? []) w.text(`• ${plain(h)}`, { size: 9.5, indent: 8 });
      w.y -= 6;
    }
  }

  if (input.projects.length) {
    w.heading(L.projects!);
    for (const pr of input.projects.slice(0, 8)) {
      w.row(plain(pr.title), range(pr.started_on, pr.completed_on, false, input.locale));
      if (pr.summary) w.text(plain(pr.summary), { size: 9.5 });
      if (pr.technologies.length) w.text(pr.technologies.join(", "), { size: 9, color: MUTED });
      w.y -= 6;
    }
  }

  if (input.education.length) {
    w.heading(L.education!);
    for (const ed of input.education) {
      w.row(plain(ed.institution), range(ed.start_date, ed.end_date, ed.is_current, input.locale));
      const sub = [ed.program, ed.field].filter(Boolean).map(plain).join(" · ");
      if (sub) w.text(sub, { size: 9.5 });
      w.y -= 6;
    }
  }

  if (input.skills.length) {
    w.heading(L.skills!);
    const groups = new Map<string, string[]>();
    for (const s of input.skills) {
      const k = s.category || "";
      groups.set(k, [...(groups.get(k) ?? []), s.name]);
    }
    for (const [cat, names] of groups)
      w.text(`${cat ? `${plain(cat)}: ` : ""}${names.map(plain).join(", ")}`, { size: 9.5, gap: 2 });
  }

  if (input.achievements.length) {
    w.heading(L.achievements!);
    for (const a of input.achievements.slice(0, 10)) {
      w.row(plain(a.title), ym(a.achieved_on, input.locale));
      if (a.organization) w.text(plain(a.organization), { size: 9, color: MUTED });
      w.y -= 4;
    }
  }

  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    const foot = `${L.generated} ${input.siteUrl.replace(/^https?:\/\//, "")}   ·   ${i + 1}/${pages.length}`;
    pg.drawText(foot, { x: M, y: 24, size: 7.5, font: reg, color: MUTED });
  });

  return doc.save();
}
