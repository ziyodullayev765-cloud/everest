"use client";
import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import type { StudentAssignmentRow } from "@/server/services/assignments";
import type { StudentStatus } from "@/lib/assignment-kinds";
import { AssignmentCard } from "./assignment-card";
import { STATUS_META } from "./status";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

type Deadline = "all" | "today" | "week" | "overdue" | "none";
const DONE: StudentStatus[] = ["submitted", "reviewing", "graded", "read"];

export function AssignmentBoard({ rows, initialView = "active", emptyTitle = tr("Hozircha vazifa yo‘q"), emptyText, showSearch = true, narrow }: { narrow?: boolean; rows: StudentAssignmentRow[]; initialView?: "active" | "done" | "all"; emptyTitle?: string; emptyText?: string; showSearch?: boolean }) {
  const [view, setView] = useState(initialView);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"" | StudentStatus>("");
  const [deadline, setDeadline] = useState<Deadline>("all");
  const [q, setQ] = useState("");
  const subjects = useMemo(() => [...new Map(rows.map((r) => [r.subjectId, r.subjectName])).entries()], [rows]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const endOfDay = (() => {
      const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
      return now + ((24 - d.getHours()) * 60 - d.getMinutes()) * 60_000;
    })();
    return rows.filter((r) => {
      const done = DONE.includes(r.status);
      if (view === "active" && done) return false;
      if (view === "done" && !done) return false;
      if (subject && r.subjectId !== subject) return false;
      if (status && r.status !== status) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      const due = r.dueAt ? new Date(r.dueAt).getTime() : null;
      if (deadline === "today" && !(due && due >= now && due <= endOfDay)) return false;
      if (deadline === "week" && !(due && due >= now && due <= now + 7 * 86400_000)) return false;
      if (deadline === "overdue" && !(due && due < now)) return false;
      if (deadline === "none" && due) return false;
      return true;
    });
  }, [rows, view, subject, status, deadline, q]);

  const counts = { active: rows.filter((r) => !DONE.includes(r.status)).length, done: rows.filter((r) => DONE.includes(r.status)).length, all: rows.length };

  return (
    <div>
      <div className={cn("mb-4 flex flex-col gap-3", !narrow && "xl:flex-row xl:items-center xl:justify-between")}>
        <div className="inline-flex w-full rounded-xl border border-border bg-surface-2 p-1 sm:w-auto" role="tablist">
          {(
            [
              ["active", "Faol"],
              ["done", "Bajarilgan"],
              ["all", "Barchasi"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={cn("inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-muted transition sm:flex-none", view === k && "bg-surface text-text shadow-soft")}
            >
              {label}
              <span className="rounded-full bg-surface-3 px-1.5 text-[11px] tabular">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*]:sm:min-w-36 [&>*]:sm:flex-1">
          {showSearch ? (
            <div className="relative col-span-2 sm:w-52">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Qidirish")} className="h-10 pl-9" aria-label={tr("Vazifa nomi bo‘yicha qidirish")} />
            </div>
          ) : null}
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label={tr("Kategoriya")} className="h-10 sm:w-40">
            <option value="">{tr("Barcha kategoriyalar")}</option>
            {subjects.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as StudentStatus | "")} aria-label={tr("Holat")} className="h-10 sm:w-40">
            <option value="">{tr("Barcha holatlar")}</option>
            {(Object.keys(STATUS_META) as StudentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Select value={deadline} onChange={(e) => setDeadline(e.target.value as Deadline)} aria-label={tr("Muddat")} className="col-span-2 h-10 sm:col-span-1 sm:w-40">
            <option value="all">{tr("Har qanday muddat")}</option>
            <option value="today">{tr("Bugun")}</option>
            <option value="week">{tr("7 kun ichida")}</option>
            <option value="overdue">{tr("Muddati o‘tgan")}</option>
            <option value="none">{tr("Muddatsiz")}</option>
          </Select>
        </div>
      </div>
      {filtered.length ? (
        <div className={cn("grid gap-3", narrow ? "md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : "md:grid-cols-2")}>
          {filtered.map((r) => (
            <AssignmentCard key={r.id} a={r} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/60">
          <EmptyState icon={<ClipboardList />} title={rows.length ? tr("Mos vazifa topilmadi") : emptyTitle} description={rows.length ? tr("Saralash shartlarini o‘zgartirib ko‘ring.") : emptyText} />
        </div>
      )}
    </div>
  );
}
