import { Badge, type Tone } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/assignment-kinds";
import { t } from "@/lib/i18n";

export const STATUS_META: Record<StudentStatus, { label: string; tone: Tone }> = {
  new: { label: t.status.new, tone: "info" },
  in_progress: { label: t.status.in_progress, tone: "warning" },
  submitted: { label: t.status.submitted, tone: "primary" },
  reviewing: { label: t.status.reviewing, tone: "violet" },
  graded: { label: t.status.graded, tone: "success" },
  overdue: { label: t.status.overdue, tone: "danger" },
  returned: { label: t.status.returned, tone: "warning" },
  read: { label: t.status.read, tone: "success" },
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}
