/**
 * DEMO DATA for local development and previews — accounts, classes, subjects and a handful of
 * published assignments/quizzes. It creates NO submissions, grades or activity history: every chart
 * starts empty and fills only from real use. Refuses to run in production unless ALLOW_DEMO_SEED=1.
 */
import { config } from "dotenv";
if (!process.env.DATABASE_URL) config({ path: ".env.local", quiet: true });
config({ quiet: true });

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
  console.error("Refusing to seed demo data in production. Set ALLOW_DEMO_SEED=1 to override.");
  process.exit(1);
}

const { db, closeDb, schema } = await import("../src/server/db");
const { hashPassword } = await import("../src/server/auth/password");
const { saveAssignment, saveQuestions } = await import("../src/server/services/assignments");
const { sql } = await import("drizzle-orm");

const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo12345";
const exists = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
if ((exists[0]?.n ?? 0) > 0 && !process.argv.includes("--force")) {
  console.log("Database already has users — skipping demo seed (use --force to add anyway).");
  await closeDb();
  process.exit(0);
}
const hash = await hashPassword(PASSWORD);

async function user(username: string, displayName: string, role: "super_admin" | "admin" | "teacher" | "student", extra: Partial<typeof schema.users.$inferInsert> = {}) {
  const [u] = await db.insert(schema.users).values({ username, displayName, role, passwordHash: hash, ...extra }).returning();
  return u;
}

const admin = await user("admin", "Dilnoza Karimova", "super_admin");
const tMath = await user("t.rahimov", "Rustam Rahimov", "teacher", { permissions: ["assignments.create", "reports.export"] });
const tLang = await user("t.saidova", "Malika Saidova", "teacher", { permissions: ["assignments.create"] });
const students = await Promise.all(
  [
    ["ali.valiyev", "Ali Valiyev", "S-1001"],
    ["madina.usmonova", "Madina Usmonova", "S-1002"],
    ["jasur.toshmatov", "Jasur Toshmatov", "S-1003"],
    ["nigora.aliyeva", "Nigora Aliyeva", "S-1004"],
    ["sardor.qodirov", "Sardor Qodirov", "S-1005"],
    ["zarina.ismoilova", "Zarina Ismoilova", "S-1006"],
  ].map(([u, n, c]) => user(u, n, "student", { studentCode: c })),
);

const [math, eng, phys] = await db
  .insert(schema.subjects)
  .values([
    { name: "Matematika", code: "MATH", color: "#0f7a5a" },
    { name: "Ingliz tili", code: "ENG", color: "#2f64c8" },
    { name: "Fizika", code: "PHYS", color: "#a8650c" },
  ])
  .returning();
const [c7a, c7b] = await db
  .insert(schema.classes)
  .values([
    { name: "7-A", gradeLevel: 7, academicYear: "2026-2027", joinCode: "EVR7AA" },
    { name: "7-B", gradeLevel: 7, academicYear: "2026-2027" },
  ])
  .returning();
await db.insert(schema.classStudents).values([
  ...students.slice(0, 4).map((s) => ({ classId: c7a.id, studentId: s.id })),
  ...students.slice(4).map((s) => ({ classId: c7b.id, studentId: s.id })),
]);
await db.insert(schema.classTeachers).values([
  { classId: c7a.id, teacherId: tMath.id, subjectId: math.id },
  { classId: c7b.id, teacherId: tMath.id, subjectId: math.id },
  { classId: c7a.id, teacherId: tMath.id, subjectId: phys.id },
  { classId: c7a.id, teacherId: tLang.id, subjectId: eng.id },
]);

const local = (days: number, hour = 23, minute = 0) => {
  const d = new Date(Date.now() + days * 86400_000 + 5 * 3600_000);
  return `${d.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
const tm = { id: tMath.id, role: tMath.role, permissions: tMath.permissions, displayName: tMath.displayName };
const tl = { id: tLang.id, role: tLang.role, permissions: tLang.permissions, displayName: tLang.displayName };

await saveAssignment(tm, null, {
  title: "Kasrlarni qo‘shish va ayirish",
  description: "Darslikning 42-betidagi mashqlar asosida.",
  instructions: "1. 5 ta misolni yeching va yechimni to‘liq yozing.\n2. Har bir javobni soddalashtiring, masalan $\\frac{2}{4} = \\frac{1}{2}$.\n3. Yechimning rasmini biriktirishingiz mumkin.",
  type: "written",
  subjectId: math.id,
  dueAt: local(0, 22),
  publishMode: "now",
  maxScore: 10,
  allowLate: true,
  latePenaltyPercent: 10,
  rubric: [
    { id: "r1", title: "To‘g‘ri javoblar", maxPoints: 6 },
    { id: "r2", title: "Yechim bayoni", maxPoints: 4 },
  ],
  classIds: [c7a.id, c7b.id],
});
await saveAssignment(tm, null, {
  title: "Fizika: tezlik mavzusida laboratoriya hisobot",
  description: "Laboratoriya ishi natijalarini PDF yoki rasm ko‘rinishida yuklang.",
  instructions: "Hisobotda o‘lchovlar jadvali va $v = \\frac{s}{t}$ formulasi bo‘yicha hisob-kitob bo‘lsin.",
  type: "file_upload",
  subjectId: phys.id,
  dueAt: local(3),
  publishMode: "now",
  maxScore: 20,
  allowResubmission: true,
  maxResubmissions: 1,
  classIds: [c7a.id],
});
const quiz = await saveAssignment(tm, null, {
  title: "Haftalik test: kasrlar",
  description: "8 daqiqalik qisqa test.",
  type: "timed_quiz",
  subjectId: math.id,
  dueAt: local(2),
  publishMode: "draft",
  timeLimitMinutes: 8,
  maxAttempts: 2,
  shuffleOptions: true,
  reviewMode: "after_submit",
  classIds: [c7a.id, c7b.id],
});
await saveQuestions(tm, quiz.id, [
  { type: "single_choice", prompt: "$\\frac{1}{2} + \\frac{1}{4}$ nechaga teng?", points: 2, explanation: "Umumiy maxraj 4: $\\frac{2}{4} + \\frac{1}{4} = \\frac{3}{4}$.", options: [{ label: "$\\frac{3}{4}$", isCorrect: true }, { label: "$\\frac{2}{6}$", isCorrect: false }, { label: "$\\frac{1}{6}$", isCorrect: false }, { label: "$1$", isCorrect: false }] },
  { type: "true_false", prompt: "$\\frac{2}{3}$ kasri $\\frac{3}{4}$ dan katta.", points: 1, explanation: "$\\frac{8}{12} < \\frac{9}{12}$.", options: [{ label: "To‘g‘ri", isCorrect: false }, { label: "Noto‘g‘ri", isCorrect: true }] },
  { type: "multiple_choice", prompt: "Qaysilari $\\frac{1}{2}$ ga teng?", points: 2, options: [{ label: "$\\frac{2}{4}$", isCorrect: true }, { label: "$\\frac{3}{6}$", isCorrect: true }, { label: "$\\frac{2}{3}$", isCorrect: false }] },
  { type: "fill_blank", prompt: "$\\frac{3}{5} = \\frac{___}{10}$", points: 1, accepted: [["6"]] },
  { type: "matching", prompt: "Kasr va o‘nli kasrni moslang", points: 2, pairs: [{ left: "1/2", right: "0,5" }, { left: "1/4", right: "0,25" }, { left: "3/4", right: "0,75" }] },
]);
await db.update(schema.assignments).set({ status: "published", publishedAt: new Date() }).where(sql`id = ${quiz.id}`);

const eq1 = await saveAssignment(tl, null, {
  title: "Vocabulary quiz: School",
  description: "Maktab mavzusidagi so‘zlar.",
  type: "short_answer",
  subjectId: eng.id,
  dueAt: local(5),
  publishMode: "draft",
  maxAttempts: 1,
  reviewMode: "after_submit",
  classIds: [c7a.id],
});
await saveQuestions(tl, eq1.id, [
  { type: "short_answer", prompt: "“Kitob” so‘zining inglizcha tarjimasi?", points: 1, accepted: [["book"]] },
  { type: "short_answer", prompt: "“O‘qituvchi” so‘zining inglizcha tarjimasi?", points: 1, accepted: [["teacher"]] },
  { type: "single_choice", prompt: "Choose the correct word: I ___ a student.", points: 1, options: [{ label: "am", isCorrect: true }, { label: "is", isCorrect: false }, { label: "are", isCorrect: false }] },
  { type: "essay", prompt: "Write 3 sentences about your school.", points: 3 },
]);
await db.update(schema.assignments).set({ status: "published", publishedAt: new Date() }).where(sql`id = ${eq1.id}`);

const practice = await saveAssignment(tm, null, { title: "Mashq: o‘nli kasrlar", type: "practice", subjectId: math.id, publishMode: "draft", maxAttempts: 10, reviewMode: "after_submit", classIds: [c7a.id, c7b.id] });
await saveQuestions(tm, practice.id, [
  { type: "single_choice", prompt: "0,3 + 0,4 = ?", points: 1, options: [{ label: "0,7", isCorrect: true }, { label: "0,07", isCorrect: false }, { label: "7", isCorrect: false }] },
  { type: "short_answer", prompt: "0,5 × 2 = ?", points: 1, accepted: [["1", "1,0", "1.0"]] },
]);
await db.update(schema.assignments).set({ status: "published", publishedAt: new Date() }).where(sql`id = ${practice.id}`);

await saveAssignment(tl, null, {
  title: "O‘qish materiali: Present Simple",
  description: "Present Simple zamoni bo‘yicha qisqa qo‘llanma.",
  instructions: "Qoidalarni o‘qing va misollarni daftaringizga yozing.\n\nI work. She works. They don't work.\n\nQo‘shimcha: https://learnenglish.britishcouncil.org",
  type: "material",
  subjectId: eng.id,
  publishMode: "now",
  links: [{ title: "British Council — Present Simple", url: "https://learnenglish.britishcouncil.org/grammar" }],
  classIds: [c7a.id],
});

console.log(`✓ Demo data created (password for every demo account: ${PASSWORD})
  super admin : admin
  teachers    : t.rahimov, t.saidova
  students    : ${students.map((s) => s.username).join(", ")}`);
void admin;
await closeDb();
