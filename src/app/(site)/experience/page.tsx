import type { Metadata } from "next";
import { Briefcase, GraduationCap } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { Timeline } from "@/components/site/timeline-entry";
import { getCopy } from "@/lib/i18n/server";
import { getEducation, getExperience } from "@/lib/data/public";
import { educationToTimeline, experienceToTimeline } from "@/lib/timeline";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.experience.title,
    description: copy.experience.lead,
    alternates: { canonical: "/experience" },
  };
}

export default async function ExperiencePage() {
  const copy = await getCopy();
  const [experience, education] = await Promise.all([getExperience(), getEducation()]);
  const empty = !experience.length && !education.length;

  return (
    <>
      <PageHeader title={copy.experience.title} lead={copy.experience.lead} />
      <div className="container-x">
        {empty ? (
          <EmptyState>{copy.experience.empty}</EmptyState>
        ) : (
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
            {experience.length > 0 && (
              <section aria-labelledby="exp-h">
                <h2 id="exp-h" className="mb-10 flex items-center gap-3 text-2xl font-semibold tracking-tight">
                  <Briefcase className="text-accent size-5" aria-hidden />
                  {copy.experience.work}
                </h2>
                <Timeline items={experience.map(experienceToTimeline)} />
              </section>
            )}
            {education.length > 0 && (
              <section aria-labelledby="edu-h">
                <h2 id="edu-h" className="mb-10 flex items-center gap-3 text-2xl font-semibold tracking-tight">
                  <GraduationCap className="text-accent size-5" aria-hidden />
                  {copy.experience.education}
                </h2>
                <Timeline items={education.map(educationToTimeline)} />
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
