/**
 * DEMO DATA for local development and previews — accounts, course groups, word lists and a handful of
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
const { saveAssignment, saveQuestions, categoryId } = await import("../src/server/services/assignments");
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

const cat = async (code: string) => categoryId(code);
const [b1, a2] = await db
  .insert(schema.classes)
  .values([
    { name: "Intermediate", level: "Intermediate (B1)", description: "Dush / Chor / Juma, 15:00", joinCode: "EVRB1A" },
    { name: "Elementary", level: "Elementary (A2)", description: "Sesh / Pay / Shan, 10:00" },
  ])
  .returning();
await db.insert(schema.classStudents).values([
  ...students.slice(0, 4).map((s) => ({ classId: b1.id, studentId: s.id })),
  ...students.slice(4).map((s) => ({ classId: a2.id, studentId: s.id })),
]);
await db.insert(schema.classTeachers).values([
  { classId: b1.id, teacherId: tMath.id },
  { classId: a2.id, teacherId: tLang.id },
]);

const local = (days: number, hour = 23, minute = 0) => {
  const d = new Date(Date.now() + days * 86400_000 + 5 * 3600_000);
  return `${d.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
const tm = { id: tMath.id, role: tMath.role, permissions: tMath.permissions, displayName: tMath.displayName };
const tl = { id: tLang.id, role: tLang.role, permissions: tLang.permissions, displayName: tLang.displayName };
const publish = (id: string) => db.update(schema.assignments).set({ status: "published", publishedAt: new Date() }).where(sql`id = ${id}`);

await saveAssignment(tm, null, {
  title: "Writing: My last holiday",
  description: "80–100 so‘zli insho.",
  instructions: "Write 80–100 words about your last holiday. Use the Past Simple and at least 3 new words from Unit 5.",
  type: "written",
  subjectId: await cat("WRITING"),
  level: "B1",
  dueAt: local(0, 22),
  publishMode: "now",
  maxScore: 10,
  allowLate: true,
  latePenaltyPercent: 10,
  rubric: [
    { id: "r1", title: "Grammar", maxPoints: 4 },
    { id: "r2", title: "Vocabulary", maxPoints: 3 },
    { id: "r3", title: "Organisation", maxPoints: 3 },
  ],
  classIds: [b1.id],
});

const quiz = await saveAssignment(tm, null, {
  title: "Weekly test: Present Perfect",
  description: "8 daqiqalik test.",
  instructions: "Present Perfect = have/has + V3. We use it for experiences and for actions with a result now.\n\nI have visited London. She has lost her keys.",
  type: "timed_quiz",
  subjectId: await cat("GRAMMAR"),
  level: "B1",
  topic: "Present Perfect",
  dueAt: local(2),
  publishMode: "draft",
  timeLimitMinutes: 8,
  maxAttempts: 2,
  shuffleOptions: true,
  reviewMode: "after_submit",
  classIds: [b1.id],
});
await saveQuestions(tm, quiz.id, [
  { type: "single_choice", prompt: "I ___ never ___ sushi.", points: 1, explanation: "I/you/we/they bilan “have” + V3: I have never eaten sushi.", options: [{ label: "have / eaten", isCorrect: true }, { label: "has / eaten", isCorrect: false }, { label: "have / ate", isCorrect: false }] },
  { type: "fill_blank", prompt: "She ___ (finish) her homework already.", points: 1, accepted: [["has finished", "'s finished"]] },
  { type: "irregular_verb", prompt: "Write the past forms of the verb.", points: 2, base: "write", accepted: [["wrote"], ["written"]] },
  { type: "arrange_words", prompt: "Put the words in the correct order.", points: 2, words: ["We", "have", "lived", "here", "since", "2020"] },
  { type: "grammar_correction", prompt: "Find and correct the mistake.", points: 2, incorrect: "He have been to Paris twice.", accepted: [["He has been to Paris twice"]], explanation: "He/She/It bilan “has” ishlatiladi." },
  { type: "matching", prompt: "Match the verbs with their V3 forms.", points: 3, pairs: [{ left: "go", right: "gone" }, { left: "see", right: "seen" }, { left: "take", right: "taken" }] },
]);
await publish(quiz.id);

const practice = await saveAssignment(tm, null, {
  title: "Practice: Past Simple",
  type: "practice",
  subjectId: await cat("GRAMMAR"),
  level: "B1",
  topic: "Past Simple",
  instructions: "Past Simple: tugagan harakatlar. Regular: +ed (worked). Irregular: go → went.",
  publishMode: "draft",
  maxAttempts: 10,
  reviewMode: "after_submit",
  classIds: [b1.id],
});
await saveQuestions(tm, practice.id, [
  { type: "single_choice", prompt: "She ___ to school yesterday.", points: 1, explanation: "Yesterday → Past Simple: go → went.", options: [{ label: "went", isCorrect: true }, { label: "goes", isCorrect: false }, { label: "going", isCorrect: false }] },
  { type: "short_answer", prompt: "What is the Past Simple of “eat”?", points: 1, accepted: [["ate"]] },
]);
await publish(practice.id);

const reading = await saveAssignment(tm, null, {
  title: "Reading: A day in Samarkand",
  type: "practice",
  subjectId: await cat("READING"),
  level: "B1",
  passage:
    "Last summer, Aziz visited Samarkand with his family. They arrived early in the morning and went straight to the Registan. Aziz was amazed by the blue tiles and the huge gates. After lunch, they took a taxi to the Shah-i-Zinda. In the evening, Aziz bought a small souvenir for his sister. It was a long journey, but he says it was the best trip of his life.",
  publishMode: "draft",
  maxAttempts: 5,
  reviewMode: "after_submit",
  classIds: [b1.id],
});
await saveQuestions(tm, reading.id, [
  { type: "single_choice", prompt: "Where did they go first?", points: 1, options: [{ label: "The Registan", isCorrect: true }, { label: "Shah-i-Zinda", isCorrect: false }, { label: "A market", isCorrect: false }] },
  { type: "true_false", prompt: "Aziz bought a souvenir for his brother.", points: 1, options: [{ label: "To‘g‘ri", isCorrect: false }, { label: "Noto‘g‘ri", isCorrect: true }] },
  { type: "translation", prompt: "Translate: “It was the best trip of his life.”", points: 2, direction: "en_uz", accepted: [] },
]);
await publish(reading.id);

const translate = await saveAssignment(tl, null, {
  title: "Translation: everyday sentences",
  type: "short_answer",
  subjectId: await cat("TR_UZ_EN"),
  level: "A2",
  publishMode: "draft",
  maxAttempts: 1,
  reviewMode: "after_submit",
  classIds: [a2.id],
});
await saveQuestions(tl, translate.id, [
  { type: "translation", prompt: "Men har kuni ingliz tilini o‘rganaman.", points: 2, direction: "uz_en", accepted: [["I learn English every day", "I study English every day"]] },
  { type: "translation", prompt: "U kitob o‘qiyapti.", points: 2, direction: "uz_en", accepted: [["He is reading a book", "She is reading a book"]] },
  { type: "essay", prompt: "Write 3 sentences about your family.", points: 3 },
]);
await publish(translate.id);

await saveAssignment(tl, null, {
  title: "Grammar: Present Simple",
  description: "Present Simple bo‘yicha qisqa qo‘llanma.",
  instructions: "Qoidalarni o‘qing va misollarni daftaringizga yozing.\n\nI work. She works. They don't work.\n\nQo‘shimcha: https://learnenglish.britishcouncil.org",
  type: "material",
  subjectId: await cat("GRAMMAR"),
  level: "A2",
  topic: "Present Simple",
  publishMode: "now",
  links: [{ title: "British Council — Present Simple", url: "https://learnenglish.britishcouncil.org/grammar" }],
  classIds: [a2.id],
});

async function wordList(owner: typeof tMath, title: string, level: string, topic: string, classId: string, words: [string, string, string?][]) {
  const [l] = await db.insert(schema.wordLists).values({ title, level, topic, status: "published", createdBy: owner.id }).returning();
  await db.insert(schema.words).values(words.map(([english, uzbek, example], position) => ({ listId: l.id, english, uzbek, example: example ?? "", position })));
  await db.insert(schema.wordListTargets).values({ listId: l.id, classId });
}
await wordList(tMath, "Unit 5 — Travel", "B1", "Travel", b1.id, [
  ["journey", "sayohat, safar", "It was a long journey."],
  ["luggage", "yuk, bagaj", "Don't forget your luggage."],
  ["souvenir", "esdalik sovg‘a", "I bought a souvenir for my sister."],
  ["destination", "manzil", "Our final destination is Bukhara."],
  ["book a ticket", "chipta band qilmoq", "We booked a ticket online."],
  ["departure", "jo‘nash", "The departure is at 9 a.m."],
  ["arrival", "yetib kelish", "Our arrival was late."],
  ["sightseeing", "diqqatga sazovor joylarni ko‘rish", "We went sightseeing in Khiva."],
  ["abroad", "chet elda", "She has never been abroad."],
  ["passport", "pasport", "Show me your passport, please."],
]);
await wordList(tLang, "Everyday words", "A2", "Daily life", a2.id, [
  ["breakfast", "nonushta", "I have breakfast at 7."],
  ["usually", "odatda", "I usually walk to school."],
  ["neighbour", "qo‘shni", "My neighbour is very kind."],
  ["busy", "band", "I am busy today."],
  ["early", "erta", "She gets up early."],
  ["tired", "charchagan", "I'm tired after work."],
]);

console.log(`✓ Demo data created (password for every demo account: ${PASSWORD})
  super admin : admin
  teachers    : t.rahimov (Intermediate), t.saidova (Elementary)
  students    : ${students.map((s) => s.username).join(", ")}`);
void admin;
await closeDb();
