import type { Education, Experience } from "@/lib/types";
import type { TimelineItem } from "@/components/site/timeline-entry";

export function experienceToTimeline(e: Experience): TimelineItem {
  return {
    id: e.id,
    title: e.role || e.organization,
    subtitle: e.role ? e.organization : "",
    meta: e.employment_type,
    location: e.location,
    start: e.start_date,
    end: e.end_date,
    current: e.is_current,
    periodLabel: e.period_label,
    description: e.description,
    highlights: e.highlights,
    image: e.image_url,
    url: e.url,
  };
}

export function educationToTimeline(e: Education): TimelineItem {
  return {
    id: e.id,
    title: e.program || e.institution,
    subtitle: [e.program ? e.institution : "", e.field].filter(Boolean).join(" · "),
    location: e.location,
    start: e.start_date,
    end: e.end_date,
    current: e.is_current,
    description: e.description,
    image: e.image_url,
    url: e.url,
  };
}
