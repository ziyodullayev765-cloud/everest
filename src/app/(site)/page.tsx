import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Hero } from "@/components/site/hero";
import { AchievementCard } from "@/components/site/achievement-card";
import { CountUp } from "@/components/site/count-up";
import { Marquee } from "@/components/site/marquee";
import { ProjectShowcase } from "@/components/site/project-showcase";
import { ScrollRevealText } from "@/components/site/scroll-reveal-text";
import { SectionHeading } from "@/components/site/section-heading";
import { Magnetic } from "@/components/effects/magnetic";
import { Reveal } from "@/components/ui/reveal";
import { copy } from "@/lib/copy";
import { brandAssetUrl } from "@/lib/brand-assets";
import { getAchievements, getProfile, getProjects, getSettings, getSkills, getStats } from "@/lib/data/public";
import { isPlaceholder, ownerName } from "@/lib/defaults";
import { unique } from "@/lib/utils";

/** Bright solid blocks for the stat cards (black type on colour). */
const STAT_COLORS = ["var(--c-lime)", "var(--c-pink)", "var(--c-cyan)", "var(--c-amber)", "var(--accent)"];
const STAT_TILT = ["hover:-rotate-2", "hover:rotate-2", "hover:-rotate-1", "hover:rotate-1"];

export default async function HomePage() {
  const [settings, profile, projects, achievements, skills, stats] = await Promise.all([
    getSettings(),
    getProfile(),
    getProjects(),
    getAchievements(),
    getSkills(),
    getStats(),
  ]);

  const name = ownerName(profile, settings);
  const featuredProjects = (projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects).slice(0, 5);
  const highlightAchievements = (
    achievements.some((a) => a.featured) ? achievements.filter((a) => a.featured) : achievements
  ).slice(0, 4);
  const intro = [profile.short_intro, profile.bio].find((t) => t && !isPlaceholder(t)) ?? "";
  const ambient = brandAssetUrl("ambient.jpg");

  const tickerWords = unique([
    ...skills.map((s) => s.name),
    ...profile.interests,
    ...projects.flatMap((p) => p.technologies),
  ]).slice(0, 14);
  const ticker = tickerWords.length >= 3 ? tickerWords : ["Ijod", "Loyihalar", "Yutuqlar", "Kelajak", "G‘oyalar"];

  return (
    <>
      <Hero
        eyebrow={settings.hero_eyebrow}
        title={settings.hero_title || name}
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

      {/* Colourful ticker band */}
      <section aria-label="Yo‘nalishlar" className="relative my-8 overflow-x-clip py-6">
        <div className="bg-rainbow -mx-[5%] -rotate-2 py-1">
          <div className="bg-bg">
            <Marquee items={ticker} duration={40} />
          </div>
        </div>
      </section>

      {intro && (
        <section className="container-x mt-24 sm:mt-36">
          <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 font-mono text-xs tracking-[0.2em] text-white/70 uppercase ring-1 ring-white/10">
            <span className="bg-rainbow size-1.5 rounded-full" aria-hidden />
            {copy.about.title}
          </p>
          <ScrollRevealText
            text={intro}
            className="font-display max-w-5xl text-[clamp(1.6rem,4.2vw,3.6rem)] leading-[1.15] tracking-[-0.02em]"
          />
          <Reveal className="mt-10">
            <Link href="/about" className="group inline-flex items-center gap-3 text-lg font-medium">
              <span className="border-b border-white/30 pb-1 transition group-hover:border-white">Ko‘proq bilish</span>
              <span className="bg-rainbow grid size-10 place-items-center rounded-full text-white transition-transform group-hover:rotate-[-45deg]">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </Reveal>
        </section>
      )}

      {stats.length > 0 && (
        <section aria-label="Statistika" className="container-x mt-24 sm:mt-32">
          <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${stats.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
            {stats.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.08}>
                <div
                  className={`relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-[1.75rem] p-6 text-black transition-transform duration-500 ease-out hover:-translate-y-2 hover:scale-[1.03] sm:min-h-56 sm:p-8 ${STAT_TILT[i % STAT_TILT.length]}`}
                  style={{ background: STAT_COLORS[i % STAT_COLORS.length] }}
                >
                  <CountUp value={s.value} className="font-display block text-[clamp(2.6rem,6vw,5rem)] leading-none" />
                  <div>
                    <p className="mt-4 text-sm font-semibold sm:text-base">{s.label}</p>
                    {s.description && <p className="mt-1 text-xs text-black/60">{s.description}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {featuredProjects.length > 0 && (
        <section className="container-x mt-28 sm:mt-40" aria-labelledby="featured-projects">
          <SectionHeading
            eyebrow={copy.projects.featured}
            title={copy.sections.featuredProjects}
            lead={copy.sections.featuredProjectsLead}
          >
            <Link
              href="/projects"
              className="group inline-flex items-center gap-2 self-start rounded-full px-5 py-3 ring-1 ring-white/20 transition hover:bg-white hover:text-black md:self-auto"
            >
              {copy.sections.allProjects}
              <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" aria-hidden />
            </Link>
          </SectionHeading>
          <div className="mt-12">
            <ProjectShowcase projects={featuredProjects} />
          </div>
        </section>
      )}

      {highlightAchievements.length > 0 && (
        <section className="container-x mt-28 sm:mt-40" aria-labelledby="recent-achievements">
          <SectionHeading eyebrow={copy.achievements.title} title={copy.sections.recentAchievements}>
            <Link
              href="/achievements"
              className="group inline-flex items-center gap-2 self-start rounded-full px-5 py-3 ring-1 ring-white/20 transition hover:bg-white hover:text-black md:self-auto"
            >
              {copy.sections.allAchievements}
              <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" aria-hidden />
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

      {skills.length > 0 && (
        <section
          className="mx-2 mt-28 overflow-hidden rounded-[2.5rem] py-16 text-black sm:mx-4 sm:mt-40 sm:py-24"
          style={{ background: "var(--accent)" }}
          aria-label={copy.sections.skills}
        >
          <div className="container-x [&_.text-rainbow]:!bg-none [&_.text-rainbow]:!text-black [&_h2]:text-black [&_p]:text-black/70">
            <SectionHeading eyebrow={copy.sections.skills} title="Men nima qila olaman">
              <Link
                href="/skills"
                className="group inline-flex items-center gap-2 self-start rounded-full bg-black px-5 py-3 text-white transition hover:scale-105 md:self-auto"
              >
                {copy.sections.allSkills}
                <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" aria-hidden />
              </Link>
            </SectionHeading>
          </div>
          <div className="mt-10 space-y-2">
            <Marquee items={skills.slice(0, 10).map((s) => s.name)} duration={32} tone="dark" />
            {skills.length > 3 && <Marquee items={skills.slice(3, 14).map((s) => s.name)} duration={38} reverse tone="dark" />}
          </div>
        </section>
      )}

      {/* Giant contact CTA */}
      <section className="container-x mt-28 sm:mt-44">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[2.5rem] px-6 py-20 text-center text-black sm:px-12 sm:py-28"
            style={{ background: "linear-gradient(120deg, var(--c-amber), var(--c-pink) 50%, var(--accent))" }}
          >
            {ambient && (
              <Image
                src={ambient}
                alt=""
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="pointer-events-none object-cover object-bottom opacity-25 mix-blend-multiply"
              />
            )}
            <p className="relative font-mono text-xs tracking-[0.3em] text-black/70 uppercase">{copy.sections.contactLead}</p>
            <h2 className="font-display relative mx-auto mt-6 max-w-5xl text-[clamp(2.6rem,9vw,8rem)] leading-[0.9] tracking-[-0.04em]">
              Keling, <span className="italic">gaplashamiz</span>
            </h2>
            <div className="relative mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Magnetic strength={0.5}>
                <Link
                  href="/contact"

                  className="grid size-40 place-items-center rounded-full bg-black text-center text-base font-semibold text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] transition-transform hover:scale-110 sm:size-48 sm:text-lg"
                >
                  <span className="px-4">{settings.cta_secondary_label}</span>
                </Link>
              </Magnetic>
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="text-lg font-medium text-black underline decoration-black/30 underline-offset-8 transition hover:decoration-black"
                >
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
