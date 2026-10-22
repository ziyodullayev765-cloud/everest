import Link from "next/link";
import { BookOpenText, ChevronRight, Headphones, PenLine } from "lucide-react";
import { listForStudent, type StudentAssignmentRow } from "@/server/services/assignments";
import { isQuizType } from "@/lib/assignment-kinds";
import { areaOf } from "@/lib/course";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { StatusBadge } from "./status";

type Area = "grammar" | "reading" | "listening";

const META: Record<Area, { title: string; description: string; empty: string; icon: typeof PenLine }> = {
  grammar: { title: "Grammatika", description: "Mavzular bo‘yicha qoida, misollar va mashqlar. O‘zlashtirish darajasi urinishlaringizdan hisoblanadi.", empty: "Ustozingiz grammatika mashqlarini qo‘shganda shu yerda mavzular bo‘yicha chiqadi.", icon: PenLine },
  reading: { title: "Reading", description: "Inglizcha matnlar va tushunish savollari.", empty: "Ustozingiz reading matnlarini qo‘shganda shu yerda chiqadi.", icon: BookOpenText },
  listening: { title: "Listening", description: "Audio yozuvlar va tinglab tushunish savollari.", empty: "Ustozingiz listening mashqlarini qo‘shganda shu yerda chiqadi.", icon: Headphones },
};

function belongs(r: StudentAssignmentRow, area: Area) {
  if (area === "reading") return r.category === "READING" || r.hasPassage;
  if (area === "listening") return r.category === "LISTENING" || r.hasAudio;
  return areaOf(r.category) === "grammar";
}

/** Mastery from real attempts only: the average of the best score per practised activity. */
export function mastery(rows: StudentAssignmentRow[]) {
  const scored = rows.map((r) => r.bestPercent ?? (r.gradePercent != null ? Number(r.gradePercent) : null)).filter((x): x is number => x != null);
  if (!scored.length) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}

function masteryLabel(m: number | null) {
  if (m == null) return { label: "Boshlanmagan", tone: "neutral" as const };
  if (m >= 85) return { label: "O‘zlashtirilgan", tone: "success" as const };
  if (m >= 60) return { label: "Yaxshi", tone: "primary" as const };
  return { label: "Mashq kerak", tone: "warning" as const };
}

const hrefOf = (r: StudentAssignmentRow) => (isQuizType(r.type) ? `/quizzes/${r.id}` : `/assignments/${r.id}`);

function Row({ r }: { r: StudentAssignmentRow }) {
  return (
    <li>
      <Link href={hrefOf(r)} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold">{r.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
            <span>{t.assignmentType[r.type]}</span>
            {r.level ? <span>· {r.level}</span> : null}
            {r.dueAt ? <span>· muddat {formatDate(r.dueAt)}</span> : null}
          </span>
        </span>
        {r.bestPercent != null ? <span className="text-[13px] font-bold tabular">{r.bestPercent}%</span> : null}
        <StatusBadge status={r.status} />
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}

export async function PracticeSection({ studentId, area, level }: { studentId: string; area: Area; level?: string }) {
  const m = META[area];
  const all = (await listForStudent(studentId)).filter((r) => belongs(r, area));
  const levels = [...new Set(all.map((r) => r.level).filter(Boolean))].sort();
  const rows = level ? all.filter((r) => r.level === level) : all;
  const base = `/${area}`;

  const header = (
    <>
      <PageHeader title={m.title} description={m.description} />
      {levels.length > 1 ? (
        <nav className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Darajalar">
          {[["", "Barchasi"], ...levels.map((l) => [l, l])].map(([k, l]) => (
            <Link key={k} href={k ? `${base}?level=${encodeURIComponent(k)}` : base} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", (level ?? "") === k ? "border-primary bg-primary-soft text-primary-soft-fg" : "border-border bg-surface text-text-2 hover:bg-surface-2")}>
              {l}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );

  if (!rows.length)
    return (
      <div className="mx-auto max-w-4xl">
        {header}
        <Card>
          <EmptyState icon={<m.icon />} title="Hozircha mashq yo‘q" description={m.empty} />
        </Card>
      </div>
    );

  if (area !== "grammar")
    return (
      <div className="mx-auto max-w-4xl">
        {header}
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </ul>
        </Card>
      </div>
    );

  const topics = [...rows.reduce((map, r) => map.set(r.topic || "Boshqa mavzular", [...(map.get(r.topic || "Boshqa mavzular") ?? []), r]), new Map<string, StudentAssignmentRow[]>()).entries()];
  return (
    <div className="mx-auto max-w-4xl">
      {header}
      <div className="space-y-4">
        {topics.map(([topic, list]) => {
          const mm = mastery(list);
          const ml = masteryLabel(mm);
          return (
            <Card key={topic} className="overflow-hidden">
              <CardHeader
                title={topic}
                description={`${list.length} ta mashg‘ulot`}
                action={
                  <span className="flex items-center gap-2">
                    {mm != null ? <span className="text-[13px] font-bold tabular">{mm}%</span> : null}
                    <Badge tone={ml.tone}>{ml.label}</Badge>
                  </span>
                }
              />
              {mm != null ? (
                <div className="px-5 pb-2">
                  <Progress value={mm} tone={mm >= 60 ? "primary" : "warning"} label={`${topic} o‘zlashtirilishi`} />
                </div>
              ) : null}
              <ul className="divide-y divide-border border-t border-border">
                {list.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
