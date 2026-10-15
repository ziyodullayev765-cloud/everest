import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, MapPin } from "lucide-react";
import { PageHeader } from "@/components/site/section-heading";
import { SkillGroups } from "@/components/site/skill-list";
import { Timeline } from "@/components/site/timeline-entry";
import { SmartImage } from "@/components/ui/smart-image";
import { RichText } from "@/components/ui/rich-text";
import { Reveal } from "@/components/ui/reveal";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { getEducation, getExperience, getProfile, getSettings, getSkills } from "@/lib/data/public";
import { educationToTimeline, experienceToTimeline } from "@/lib/timeline";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getProfile();
  return {
    title: copy.about.title,
    description: p.short_intro.startsWith("[") ? undefined : p.short_intro,
    alternates: { canonical: "/about" },
    openGraph: p.avatar_url ? { images: [{ url: p.avatar_url, alt: p.avatar_alt }] } : undefined,
  };
}

function Block({ title, text }: { title: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <Reveal className="border-line grid gap-4 border-t pt-10 md:grid-cols-[220px_1fr] md:gap-10">
      <h2 className="text-accent font-mono text-xs tracking-[0.2em] uppercase">{title}</h2>
      <RichText text={text} />
    </Reveal>
  );
}

export default async function AboutPage() {
  const [profile, settings, skills, education, experience] = await Promise.all([
    getProfile(),
    getSettings(),
    getSkills(),
    getEducation(),
    getExperience(),
  ]);
  const resume = settings.show_resume ? profile.resume_url : null;

  return (
    <>
      <PageHeader eyebrow={copy.about.title} title={profile.full_name} lead={profile.headline} />

      <section className="container-x grid gap-12 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-line relative aspect-[4/5] overflow-hidden rounded-[2rem] border bg-gradient-to-b from-white/[0.06] to-transparent">
            {profile.avatar_url ? (
              <SmartImage
                src={profile.avatar_url}
                alt={profile.avatar_alt || profile.full_name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-cover"
              />
            ) : (
              <div className="text-subtle absolute inset-0 grid place-items-center text-center text-sm">
                <span>[Profil surati — admin paneldan yuklang]</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-white/10 ring-inset" />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {profile.location && (
              <span className="text-muted inline-flex items-center gap-1.5 text-sm">
                <MapPin className="size-4" aria-hidden />
                {profile.location}
              </span>
            )}
            {resume && (
              <a href={resume} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
                <Download className="size-4" aria-hidden />
                {copy.downloadCv}
              </a>
            )}
          </div>
        </Reveal>

        <div className="grid gap-10">
          {profile.short_intro && (
            <Reveal>
              <p className="text-fg text-2xl leading-snug tracking-tight sm:text-3xl">{profile.short_intro}</p>
            </Reveal>
          )}
          <Block title={copy.about.bio} text={profile.bio} />
          <Block title={copy.about.story} text={profile.story} />
          <Block title={copy.about.background} text={profile.background} />
          <Block title={copy.about.learning} text={profile.learning_journey} />
          <Block title={copy.about.goals} text={profile.goals} />
          {profile.interests.length > 0 && (
            <Reveal className="border-line grid gap-4 border-t pt-10 md:grid-cols-[220px_1fr] md:gap-10">
              <h2 className="text-accent font-mono text-xs tracking-[0.2em] uppercase">{copy.about.interests}</h2>
              <ul className="flex flex-wrap gap-2">
                {profile.interests.map((i) => (
                  <li key={i} className="glass rounded-full px-4 py-2 text-sm">
                    {i}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </section>

      {skills.length > 0 && (
        <section className="container-x mt-28" aria-labelledby="about-skills">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 id="about-skills" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy.about.skills}
            </h2>
            <Link href="/skills" className="text-muted hover:text-fg inline-flex items-center gap-1.5 text-sm">
              {copy.sections.allSkills} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <SkillGroups skills={skills} />
        </section>
      )}

      {(experience.length > 0 || education.length > 0) && (
        <section className="container-x mt-28 grid gap-16 lg:grid-cols-2">
          {experience.length > 0 && (
            <div>
              <h2 className="mb-10 text-3xl font-semibold tracking-tight">{copy.about.experience}</h2>
              <Timeline items={experience.slice(0, 4).map(experienceToTimeline)} />
            </div>
          )}
          {education.length > 0 && (
            <div>
              <h2 className="mb-10 text-3xl font-semibold tracking-tight">{copy.about.education}</h2>
              <Timeline items={education.slice(0, 4).map(educationToTimeline)} />
            </div>
          )}
        </section>
      )}
    </>
  );
}
