import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { EdMarquee } from "@/components/site/ed-marquee";
import { EdSection } from "@/components/site/ed-section";
import { GlowCard } from "@/components/site/glow-card";
import { HomeBackdrop } from "@/components/site/home-backdrop";
import { ScrambleText } from "@/components/site/scramble-text";
import type { DomeTileData } from "@/components/site/dome-gallery";
import { copy } from "@/lib/copy";
import {
  getAchievements,
  getExperience,
  getGallery,
  getProfile,
  getProjects,
  getSettings,
  getSkills,
  getSocialLinks,
  getStats,
} from "@/lib/data/public";
import { isPlaceholder, ownerName } from "@/lib/defaults";
import { formatRange, unique } from "@/lib/utils";

const FALLBACK_WORDS = ["Loyihalar", "Yutuqlar", "Ko‘nikmalar", "Tajriba", "Galereya", "Ijod", "G‘oyalar", "Aloqa"];
const SECTION = "mb-[clamp(4rem,12vh,8rem)]";

export default async function HomePage() {
  const [settings, profile, projects, achievements, skills, stats, experience, social, gallery] = await Promise.all([
    getSettings(),
    getProfile(),
    getProjects(),
    getAchievements(),
    getSkills(),
    getStats(),
    getExperience(),
    getSocialLinks(),
    getGallery(),
  ]);

  const name = ownerName(profile, settings);
  const featured = projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects;
  const highlights = (achievements.some((a) => a.featured) ? achievements.filter((a) => a.featured) : achievements).slice(0, 6);
  const subtitle = [settings.hero_description, profile.short_intro, profile.headline].find((t) => t && !isPlaceholder(t)) ?? "";

  // Dome tiles: every image in the CMS, otherwise labelled placeholder tiles.
  const images: DomeTileData[] = [
    ...gallery.map((m) => ({ src: m.url, alt: m.alt_text, label: m.caption })),
    ...projects.flatMap((p) => [
      ...(p.thumbnail_url ? [{ src: p.thumbnail_url, alt: p.thumbnail_alt || p.title, label: p.title }] : []),
      ...p.gallery.map((g) => ({ src: g.url, alt: g.alt || p.title, label: p.title })),
    ]),
    ...achievements.filter((a) => a.image_url).map((a) => ({ src: a.image_url, alt: a.image_alt || a.title, label: a.title })),
    ...(profile.avatar_url ? [{ src: profile.avatar_url, alt: profile.avatar_alt || name, label: name }] : []),
  ];
  const words = unique([...skills.map((s) => s.name), ...projects.map((p) => p.title), ...profile.interests]);
  const tiles: DomeTileData[] = images.length
    ? images
    : (words.length >= 4 ? words : FALLBACK_WORDS).map((w) => ({ src: null, alt: "", label: w }));

  const ticker = unique([
    ...(profile.headline && !isPlaceholder(profile.headline) ? [profile.headline] : []),
    ...skills.map((s) => s.name),
    ...profile.interests,
    ...achievements.slice(0, 4).map((a) => a.title),
  ]).slice(0, 14);

  const skillGroups = Object.entries(
    skills.reduce<Record<string, string[]>>((acc, s) => {
      const key = s.category || copy.skills.other;
      (acc[key] ??= []).push(s.name);
      return acc;
    }, {}),
  ).slice(0, 6);

  return (
    <div className="relative">
      <HomeBackdrop tiles={tiles} animate={settings.enable_3d} />

      <div className="relative z-[2] mx-auto w-[min(1120px,calc(100%-2rem))]">
        {/* The name sits over the lower part of the dome; the dome stays draggable above it. */}
        <header className="pointer-events-none flex flex-col items-center pt-[64svh] text-center">
          <div className="pointer-events-auto max-w-3xl">
            <ScrambleText as="h1" text={name} className="ed-heading text-[clamp(2.4rem,8vw,5rem)] leading-[1.1]" />
            {subtitle && (
              <p className="mt-5 text-[clamp(1rem,2.2vw,1.25rem)] leading-[1.7] text-[var(--fg-secondary)]">{subtitle}</p>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3.5">
              <Link href="#projects" className="ed-button">
                {settings.cta_primary_label}
              </Link>
              <Link href="#contact" className="ed-button">
                {settings.cta_secondary_label}
              </Link>
            </div>
          </div>
        </header>

        <div className="my-8">
          <EdMarquee items={ticker.length >= 3 ? ticker : FALLBACK_WORDS} />
        </div>

        <EdSection id="projects" className={SECTION}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[clamp(2rem,5vw,2.8rem)]">{copy.sections.featuredProjects}</h2>
              <p className="mt-1 text-sm text-[var(--fg-secondary)]">
                {featured.length ? "Gorizontal suring va ishlarni ko‘ring" : copy.projects.empty}
              </p>
            </div>
            <Link href="/projects" className="ed-button">
              {copy.sections.allProjects}
            </Link>
          </div>
          {featured.length > 0 && (
            <div className="mt-6 flex snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto pt-2 pb-6">
              {featured.map((p, i) => {
                const year = (p.completed_on ?? p.started_on)?.slice(0, 4);
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.slug}`}
                    className="group border-line bg-surface hover:border-line-strong flex h-[340px] w-[300px] shrink-0 snap-center flex-col justify-between rounded-2xl border p-6 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] sm:w-[360px] md:w-[400px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold opacity-60">{String(i + 1).padStart(2, "0")}</span>
                        {p.category && (
                          <span className="border-accent/25 bg-accent/10 text-accent rounded-full border px-2 py-0.5 text-[0.7rem] font-medium tracking-wider uppercase">
                            {p.category}
                          </span>
                        )}
                      </div>
                      <span className="bg-accent inline-flex scale-95 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-[#0d0d0d] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                        Ko‘rish <ArrowUpRight className="size-3" aria-hidden />
                      </span>
                    </div>
                    <div className="my-auto space-y-2">
                      <h3 className="group-hover:text-accent text-xl font-bold normal-case transition-colors">{p.title}</h3>
                      {p.summary && (
                        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--fg-secondary)]">{p.summary}</p>
                      )}
                    </div>
                    <div className="border-line flex items-center justify-between border-t pt-4">
                      <div className="flex flex-wrap gap-1.5">
                        {unique([...p.technologies, ...p.tags])
                          .slice(0, 3)
                          .map((t) => (
                            <span
                              key={t}
                              className="border-line rounded-md border bg-[rgba(var(--surface-rgb),0.35)] px-2 py-0.5 text-[0.7rem] text-[var(--fg-secondary)]"
                            >
                              {t}
                            </span>
                          ))}
                      </div>
                      {year && <span className="text-muted ml-2 shrink-0 font-mono text-xs">{year}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </EdSection>

        {highlights.length > 0 && (
          <EdSection id="highlights" className={SECTION}>
            <h2 className="ed-title">Yutuqlar va bosqichlar</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {highlights.map((a) => (
                <GlowCard key={a.id} className="p-6">
                  <h3 className="text-[1.4rem] normal-case">{a.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--fg-secondary)]">
                    {a.description || [a.organization, a.achieved_on?.slice(0, 4)].filter(Boolean).join(" · ")}
                  </p>
                </GlowCard>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/achievements" className="ed-button">
                {copy.sections.allAchievements}
              </Link>
            </div>
          </EdSection>
        )}

        {stats.length > 0 && (
          <EdSection id="stats" className={SECTION} label="Statistika">
            <div className="flex flex-wrap justify-center gap-x-16 gap-y-8">
              {stats.map((s) => (
                <div key={s.id} className="text-center">
                  <span className="font-display block text-[2.5rem] font-bold">{s.value}</span>
                  <span className="text-sm text-[var(--fg-secondary)]">{s.label}</span>
                </div>
              ))}
            </div>
          </EdSection>
        )}

        {skillGroups.length > 0 && (
          <EdSection id="skills" className={SECTION}>
            <h2 className="ed-title">Ko‘nikmalar va imkoniyatlar</h2>
            <p className="ed-intro">{copy.skills.lead}</p>
            <div className="grid gap-6 md:grid-cols-3">
              {skillGroups.map(([group, names]) => (
                <GlowCard key={group} className="p-6">
                  <h3 className="text-accent text-[1.2rem]">{group}</h3>
                  <ul className="mt-4 flex flex-col gap-2">
                    {names.map((n) => (
                      <li key={n} className="text-[var(--fg-secondary)]">
                        {n}
                      </li>
                    ))}
                  </ul>
                </GlowCard>
              ))}
            </div>
          </EdSection>
        )}

        {experience.length > 0 && (
          <EdSection id="experience" className={SECTION}>
            <h2 className="ed-title">Tajriba</h2>
            <div className="mb-8 flex flex-col gap-4">
              {experience.slice(0, 3).map((e) => (
                <GlowCard key={e.id} className="p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[1.4rem] normal-case">{e.organization}</h3>
                    <span className="text-muted text-[0.8rem]">{formatRange(e.start_date, e.end_date, e.is_current)}</span>
                  </div>
                  <p className="mt-2 text-[var(--fg-secondary)]">{e.role}</p>
                </GlowCard>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/experience" className="ed-button">
                To‘liq tajriba
              </Link>
              {settings.show_resume && profile.resume_url && (
                <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="ed-button">
                  {copy.downloadCv}
                </a>
              )}
            </div>
          </EdSection>
        )}

        <EdSection id="contact" className="mb-16">
          <h2 className="ed-title">Loyiha boshlaymiz</h2>
          <p className="ed-intro">{copy.sections.contactLead}</p>
          <div className="mx-auto max-w-2xl">
            <ContactForm />
          </div>
          {social.length > 0 && (
            <div className="mt-10 flex flex-wrap justify-center gap-6">
              {social.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-fg text-[var(--fg-secondary)] transition-colors"
                >
                  {s.label || s.platform}
                </a>
              ))}
            </div>
          )}
        </EdSection>
      </div>
    </div>
  );
}
