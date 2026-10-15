import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Hero } from "@/components/site/hero";
import { ProjectCard } from "@/components/site/project-card";
import { AchievementCard } from "@/components/site/achievement-card";
import { SkillChips } from "@/components/site/skill-list";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { getAchievements, getProfile, getProjects, getSettings, getSkills, getStats } from "@/lib/data/public";

export default async function HomePage() {
  const [settings, profile, projects, achievements, skills, stats] = await Promise.all([
    getSettings(),
    getProfile(),
    getProjects(),
    getAchievements(),
    getSkills(),
    getStats(),
  ]);

  const featuredProjects = (projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects).slice(0, 3);
  const highlightAchievements = (
    achievements.some((a) => a.featured) ? achievements.filter((a) => a.featured) : achievements
  ).slice(0, 4);
  const highlightSkills = (skills.some((s) => s.featured) ? skills.filter((s) => s.featured) : skills).slice(0, 18);

  return (
    <>
      <Hero
        eyebrow={settings.hero_eyebrow}
        title={settings.hero_title || profile.full_name}
        headline={profile.headline}
        description={settings.hero_description || profile.short_intro}
        availability={profile.availability}
        location={profile.location}
        primaryLabel={settings.cta_primary_label}
        secondaryLabel={settings.cta_secondary_label}
        accent={settings.accent_color}
        enable3d={settings.enable_3d}
        particles={settings.enable_particles}
      />

      <div id="highlights" className="scroll-mt-24" />

      {stats.length > 0 && (
        <section aria-label="Statistika" className="container-x">
          <Reveal>
            <dl className="glass divide-line grid grid-cols-2 overflow-hidden rounded-[2rem] sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] sm:divide-x">
              {stats.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 p-6 sm:p-8">
                  <dt className="text-muted order-2 text-sm">{s.label}</dt>
                  <dd className="order-1 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{s.value}</dd>
                  {s.description && <dd className="text-subtle order-3 text-xs">{s.description}</dd>}
                </div>
              ))}
            </dl>
          </Reveal>
        </section>
      )}

      {featuredProjects.length > 0 && (
        <section className="container-x mt-28 sm:mt-36" aria-labelledby="featured-projects">
          <SectionHeading eyebrow="01" title={copy.sections.featuredProjects} lead={copy.sections.featuredProjectsLead}>
            <Link href="/projects" className={buttonClass("secondary", "md", "self-start md:self-auto")}>
              {copy.sections.allProjects}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </SectionHeading>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.08} className="h-full">
                <ProjectCard project={p} priority={i === 0} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {highlightAchievements.length > 0 && (
        <section className="container-x mt-28 sm:mt-36" aria-labelledby="recent-achievements">
          <SectionHeading eyebrow="02" title={copy.sections.recentAchievements}>
            <Link href="/achievements" className={buttonClass("secondary", "md", "self-start md:self-auto")}>
              {copy.sections.allAchievements}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </SectionHeading>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {highlightAchievements.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.06}>
                <AchievementCard a={a} compact />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {highlightSkills.length > 0 && (
        <section className="container-x mt-28 sm:mt-36">
          <SectionHeading eyebrow="03" title={copy.sections.skills}>
            <Link href="/skills" className={buttonClass("secondary", "md", "self-start md:self-auto")}>
              {copy.sections.allSkills}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </SectionHeading>
          <Reveal className="mt-10">
            <SkillChips skills={highlightSkills} />
          </Reveal>
        </section>
      )}

      <section className="container-x mt-28 sm:mt-40">
        <Reveal>
          <div className="border-line relative overflow-hidden rounded-[2.5rem] border bg-gradient-to-b from-white/[0.05] to-white/[0.01] px-6 py-16 text-center sm:px-12 sm:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 left-1/2 h-72 w-[42rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[100px]"
              style={{ background: "var(--accent)" }}
            />
            <h2 className="text-gradient relative mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              {copy.sections.contactTitle}
            </h2>
            <p className="text-muted relative mx-auto mt-5 max-w-xl sm:text-lg">{copy.sections.contactLead}</p>
            <div className="relative mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/contact" className={buttonClass("primary", "lg")}>
                {settings.cta_secondary_label}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              {settings.contact_email && (
                <a href={`mailto:${settings.contact_email}`} className={buttonClass("secondary", "lg")}>
                  {settings.contact_email}
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
