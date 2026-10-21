import { describe, expect, it } from "vitest";
import { bandFor, DEFAULT_SCALE, latePenalty, percentOf, validateScale } from "@/lib/grading";
import { computeStreak, earnedAchievementCodes, levelFor, quizXp, DEFAULT_XP_RULES } from "@/lib/gamification";
import { deriveStatus, submissionWindow } from "@/lib/assignment-kinds";
import { fromLocalInput, toLocalInput, weekStart, lastNDays, remaining } from "@/lib/dates";
import { can, canManageRole, homeFor } from "@/server/auth/rbac";
import { csvCell, parseCsv, safeNext, toCsv } from "@/lib/utils";
import { assignmentInput, questionInput } from "@/lib/validation/assignment";

describe("grading", () => {
  it("maps percentages to the 5-point scale", () => {
    expect(bandFor(100).label).toBe("5");
    expect(bandFor(86).label).toBe("5");
    expect(bandFor(85.99).label).toBe("4");
    expect(bandFor(56).label).toBe("3");
    expect(bandFor(0).label).toBe("2");
  });
  it("percent is clamped and rounded", () => {
    expect(percentOf(2, 3)).toBe(66.67);
    expect(percentOf(5, 0)).toBe(0);
  });
  it("late penalty never exceeds the points", () => {
    expect(latePenalty(80, 100, 10, true)).toBe(10);
    expect(latePenalty(5, 100, 10, true)).toBe(5);
    expect(latePenalty(80, 100, 10, false)).toBe(0);
  });
  it("validates custom scales", () => {
    expect(validateScale(DEFAULT_SCALE)).toBeNull();
    expect(validateScale([{ min: 50, label: "A", name: "" }, { min: 20, label: "B", name: "" }])).not.toBeNull();
    expect(validateScale([{ min: 0, label: "A", name: "" }, { min: 50, label: "A", name: "" }])).not.toBeNull();
  });
});

describe("gamification", () => {
  it("quiz XP only for the first attempt", () => {
    expect(quizXp(DEFAULT_XP_RULES, 100, true)).toBe(10 + 10 + 15);
    expect(quizXp(DEFAULT_XP_RULES, 55, true)).toBe(15);
    expect(quizXp(DEFAULT_XP_RULES, 100, false)).toBe(0);
  });
  it("levels", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(300).level).toBe(3);
    expect(levelFor(599).level).toBe(3);
  });
  it("streaks", () => {
    expect(computeStreak(["2026-10-19", "2026-10-20", "2026-10-21"], "2026-10-21")).toEqual({ current: 3, best: 3 });
    expect(computeStreak(["2026-10-19", "2026-10-20"], "2026-10-21").current).toBe(2);
    expect(computeStreak(["2026-10-18"], "2026-10-21").current).toBe(0);
    expect(computeStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-21"], "2026-10-21")).toEqual({ current: 1, best: 4 });
    expect(computeStreak([], "2026-10-21")).toEqual({ current: 0, best: 0 });
  });
  it("achievements from stats", () => {
    const base = { submissions: 0, onTimeSubmissions: 0, quizzes: 0, perfectQuizzes: 0, streakBest: 0, xp: 0, gradedCount: 0, averagePercent: null };
    expect(earnedAchievementCodes(base)).toEqual([]);
    expect(earnedAchievementCodes({ ...base, submissions: 1, streakBest: 7 })).toEqual(["first_submission", "streak_3", "streak_7"]);
    expect(earnedAchievementCodes({ ...base, gradedCount: 4, averagePercent: 99 })).not.toContain("scholar");
  });
});

describe("assignment status", () => {
  const now = new Date("2026-10-21T10:00:00Z");
  const past = new Date("2026-10-20T10:00:00Z");
  const future = new Date("2026-10-22T10:00:00Z");
  const none = { open: false, submitted: 0, pendingManual: false };
  it("work lifecycle", () => {
    expect(deriveStatus({ type: "written", dueAt: future, now, submission: null, attempts: none, grade: null })).toBe("new");
    expect(deriveStatus({ type: "written", dueAt: past, now, submission: null, attempts: none, grade: null })).toBe("overdue");
    expect(deriveStatus({ type: "written", dueAt: future, now, submission: { status: "draft", version: 0 }, attempts: none, grade: null })).toBe("in_progress");
    expect(deriveStatus({ type: "written", dueAt: future, now, submission: { status: "submitted", version: 1 }, attempts: none, grade: null })).toBe("submitted");
    expect(deriveStatus({ type: "written", dueAt: past, now, submission: { status: "submitted", version: 1 }, attempts: none, grade: { status: "provisional" } })).toBe("reviewing");
    expect(deriveStatus({ type: "written", dueAt: past, now, submission: { status: "graded", version: 1 }, attempts: none, grade: { status: "final" } })).toBe("graded");
    expect(deriveStatus({ type: "written", dueAt: future, now, submission: { status: "returned", version: 1 }, attempts: none, grade: null })).toBe("returned");
  });
  it("quiz lifecycle", () => {
    expect(deriveStatus({ type: "timed_quiz", dueAt: future, now, submission: null, attempts: { ...none, open: true }, grade: null })).toBe("in_progress");
    expect(deriveStatus({ type: "timed_quiz", dueAt: future, now, submission: null, attempts: { open: false, submitted: 1, pendingManual: true }, grade: null })).toBe("reviewing");
    expect(deriveStatus({ type: "timed_quiz", dueAt: future, now, submission: null, attempts: { open: false, submitted: 1, pendingManual: false }, grade: { status: "final" } })).toBe("graded");
  });
  it("material", () => {
    expect(deriveStatus({ type: "material", dueAt: null, now, submission: { status: "submitted", version: 1 }, attempts: none, grade: null })).toBe("read");
  });
  it("submission window", () => {
    expect(submissionWindow({ dueAt: future, allowLate: false, lateCutoffAt: null }, now)).toEqual({ open: true, late: false });
    expect(submissionWindow({ dueAt: past, allowLate: false, lateCutoffAt: null }, now)).toEqual({ open: false, late: true });
    expect(submissionWindow({ dueAt: past, allowLate: true, lateCutoffAt: null }, now)).toEqual({ open: true, late: true });
    expect(submissionWindow({ dueAt: past, allowLate: true, lateCutoffAt: past }, now).open).toBe(false);
  });
});

describe("dates", () => {
  it("datetime-local round trip in Tashkent time", () => {
    const d = fromLocalInput("2026-10-21T09:30")!;
    expect(d.toISOString()).toBe("2026-10-21T04:30:00.000Z");
    expect(toLocalInput(d)).toBe("2026-10-21T09:30");
    expect(fromLocalInput("bad")).toBeNull();
  });
  it("weeks start on Monday", () => {
    expect(weekStart("2026-10-21")).toBe("2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(lastNDays("2026-10-21", 3)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21"]);
  });
  it("remaining time text", () => {
    const now = new Date("2026-10-21T10:00:00Z");
    expect(remaining(new Date("2026-10-23T12:00:00Z"), now).text).toBe("2 kun 2 soat qoldi");
    expect(remaining(new Date("2026-10-21T09:00:00Z"), now).overdue).toBe(true);
  });
});

describe("rbac", () => {
  const teacher = { id: "t", role: "teacher" as const, permissions: ["assignments.create"] };
  it("permissions", () => {
    expect(can(teacher, "assignments.create")).toBe(true);
    expect(can(teacher, "grades.edit_final")).toBe(false);
    expect(can({ id: "a", role: "admin", permissions: [] }, "grades.edit_final")).toBe(true);
    expect(can({ id: "s", role: "student", permissions: ["assignments.create"] }, "assignments.create")).toBe(false);
  });
  it("only super admins manage admins", () => {
    expect(canManageRole({ id: "a", role: "admin", permissions: [] }, "admin")).toBe(false);
    expect(canManageRole({ id: "a", role: "admin", permissions: [] }, "student")).toBe(true);
    expect(canManageRole({ id: "x", role: "super_admin", permissions: [] }, "admin")).toBe(true);
    expect(canManageRole(teacher, "student")).toBe(false);
  });
  it("home routes", () => expect([homeFor("student"), homeFor("teacher"), homeFor("admin")]).toEqual(["/", "/teacher", "/admin"]));
});

describe("utils", () => {
  it("safeNext blocks open redirects", () => {
    expect(safeNext("/assignments")).toBe("/assignments");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
  });
  it("CSV escaping guards against formula injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(toCsv([["a", 1]]).startsWith("﻿")).toBe(true);
  });
  it("parses CSV with quotes and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});

describe("validation", () => {
  const base = { title: "Test", type: "written", subjectId: "00000000-0000-4000-8000-000000000000", publishMode: "now" };
  it("publishing requires a target", () => {
    expect(assignmentInput.safeParse(base).success).toBe(false);
    expect(assignmentInput.safeParse({ ...base, classIds: ["00000000-0000-4000-8000-000000000001"] }).success).toBe(true);
  });
  it("rubric must sum to max score", () => {
    const r = assignmentInput.safeParse({ ...base, publishMode: "draft", maxScore: 10, rubric: [{ id: "a", title: "A", maxPoints: 4 }] });
    expect(r.success).toBe(false);
  });
  it("question rules", () => {
    expect(questionInput.safeParse({ type: "single_choice", prompt: "?", options: [{ label: "a", isCorrect: true }, { label: "b", isCorrect: true }] }).success).toBe(false);
    expect(questionInput.safeParse({ type: "fill_blank", prompt: "2+2=___", accepted: [["4"]] }).success).toBe(true);
    expect(questionInput.safeParse({ type: "fill_blank", prompt: "2+2=___", accepted: [] }).success).toBe(false);
  });
});
