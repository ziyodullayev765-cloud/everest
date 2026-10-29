import { afterAll, describe, expect, it } from "vitest";
import { crc32, deflateRawSync } from "node:zlib";
import { and, eq, isNull } from "drizzle-orm";
import { closeDb, db, schema } from "@/server/db";
import { getImport, importReportCsv, listImports, previewImport, revertImport, runImport } from "@/server/services/vocab-import";
import { recordReview, saveWordList, vocabOverview } from "@/server/services/vocabulary";
import { enroll, makeClass, makeUser, teach } from "./fixtures";

afterAll(async () => closeDb());

const b64 = (s: string | Uint8Array) => Buffer.from(s).toString("base64");
const liveWords = (listId: string) => db.select().from(schema.words).where(and(eq(schema.words.listId, listId), isNull(schema.words.archivedAt)));

/** A minimal real .xlsx (zip + XML) with shared strings and an inline string. */
function xlsx(rows: string[][]): Uint8Array {
  const strings: string[] = [];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const sheetRows = rows
    .map((r, i) => `<row r="${i + 1}">${r.map((v, j) => {
      const ref = `${String.fromCharCode(65 + j)}${i + 1}`;
      if (j === 2) return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
      strings.push(v);
      return `<c r="${ref}" t="s"><v>${strings.length - 1}</v></c>`;
    }).join("")}</row>`)
    .join("");
  const files: [string, string][] = [
    ["[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`],
    ["xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns:r="r"><sheets><sheet name="Words" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ["xl/sharedStrings.xml", `<?xml version="1.0"?><sst>${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join("")}</sst>`],
    ["xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet><sheetData>${sheetRows}</sheetData></worksheet>`],
  ];
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const raw = Buffer.from(content, "utf8");
    const data = deflateRawSync(raw);
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc32(raw), 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc32(raw), 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, data);
    centrals.push(ch, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}

describe("vocabulary import", () => {
  it("imports CSV with unfamiliar headers into a new set, assigns groups and reports nothing silently", async () => {
    const admin = await makeUser("admin");
    const [A, B] = [await makeClass("ImpA"), await makeClass("ImpB")];
    const [a, b] = [await makeUser("student"), await makeUser("student")];
    await enroll(A.id, a.id);
    await enroll(B.id, b.id);
    // Semicolon-delimited, Uzbek headers, a comma inside a translation, Uzbek letters.
    const csv = "So‘z;Tarjima;Misol;Qiyinlik\njourney;sayohat, safar;It was a long journey.;medium\nbook;kitob;;easy\nO‘zbek;o‘zbek;;C1\n";
    const preview = await previewImport(admin, { fileName: "words.csv", base64: b64(csv) });
    expect(preview.format).toBe("csv");
    expect(preview.mapping).toEqual(["english", "uzbek", "example", "difficulty"]);
    expect(preview.counts.new).toBe(3);

    const r = await runImport(admin, { fileName: "words.csv", base64: b64(csv), mapping: preview.mapping, newList: { title: `CSV set ${Date.now()}` }, classIds: [A.id], publish: true });
    const words = await liveWords(r.listId);
    expect(words.map((w) => [w.english, w.uzbek, w.difficulty]).sort()).toEqual([["O‘zbek", "o‘zbek", 3], ["book", "kitob", 1], ["journey", "sayohat, safar", 2]]);
    expect(words.every((w) => w.importJobId === r.jobId)).toBe(true);
    expect((await vocabOverview(a)).lists.map((l) => l.id)).toContain(r.listId);
    expect((await vocabOverview(b)).lists.map((l) => l.id)).not.toContain(r.listId);
    const job = await getImport(admin, r.jobId);
    expect([job.job.added, job.job.failed, job.job.skipped, job.job.status]).toEqual([3, 0, 0, "done"]);
    expect(job.groups.map((g) => g.id)).toEqual([A.id]);
  });

  it("reads XLSX and JSON, and reports each bad row precisely", async () => {
    const admin = await makeUser("admin");
    const listId = await saveWordList(admin, null, { title: `Mixed ${Date.now()}` });
    const file = xlsx([
      ["Word", "Meaning", "Example sentence"],
      ["apple", "olma", "I eat an apple."],
      ["", "bo‘sh", "missing english"],
      ["pear", "", "missing translation"],
      ["apple", "olma", "again in the file"],
      ["cherry", "gilos", "Cherries are red & sweet."],
    ]);
    const p = await previewImport(admin, { fileName: "list.xlsx", base64: b64(file), listId });
    expect(p.format).toBe("xlsx");
    expect(p.mapping).toEqual(["english", "uzbek", "example"]);
    expect(p.counts).toMatchObject({ new: 2, invalid: 2, duplicate_in_file: 1 });
    expect(p.rows.filter((r) => r.status === "invalid").map((r) => r.line)).toEqual([3, 4]);
    const r = await runImport(admin, { fileName: "list.xlsx", base64: b64(file), mapping: p.mapping, listId });
    const job = (await getImport(admin, r.jobId)).job;
    expect([job.added, job.failed, job.skipped]).toEqual([2, 2, 1]);
    expect(job.errors.map((e) => [e.line, e.kind])).toEqual([[3, "error"], [4, "error"], [5, "skipped"]]);
    expect((await liveWords(listId)).find((w) => w.english === "cherry")?.example).toBe("Cherries are red & sweet.");
    const report = await importReportCsv(admin, r.jobId);
    expect(report.body).toContain("Tarjima");

    const json = JSON.stringify({ words: [{ term: "plum", translation: "olxo‘ri", synonyms: ["prune"], lesson: "Unit 2" }] });
    const pj = await previewImport(admin, { fileName: "w.json", base64: b64(json), listId });
    expect(pj.mapping).toEqual(["english", "uzbek", "synonyms", "unit"]);
    await runImport(admin, { fileName: "w.json", base64: b64(json), mapping: pj.mapping, listId });
    expect((await liveWords(listId)).find((w) => w.english === "plum")).toMatchObject({ synonyms: "prune", unit: "Unit 2" });

    await expect(previewImport(admin, { fileName: "x.json", base64: b64("{oops") })).rejects.toThrow(/JSON/);
    await expect(previewImport(admin, { fileName: "x.pdf", base64: b64("%PDF") })).rejects.toThrow();
  });

  it("importing the same file twice adds nothing; the update policy changes words and undo restores them", async () => {
    const admin = await makeUser("admin");
    const listId = await saveWordList(admin, null, { title: `Twice ${Date.now()}` });
    const text = "english,uzbek\nriver,daryo\nsea,dengiz\n";
    const p1 = await previewImport(admin, { text, listId });
    await runImport(admin, { text, mapping: p1.mapping, listId });
    const p2 = await previewImport(admin, { text, listId });
    expect(p2.counts).toMatchObject({ new: 0, exists_same: 2 });
    expect(p2.previousImport).not.toBeNull();
    await runImport(admin, { text, mapping: p2.mapping, listId });
    expect(await liveWords(listId)).toHaveLength(2);

    const changed = "english,uzbek\nriver,soy\nlake,ko‘l\n";
    const p3 = await previewImport(admin, { text: changed, listId });
    expect(p3.counts).toMatchObject({ new: 1, exists_changed: 1 });
    const skip = await runImport(admin, { text: changed, mapping: p3.mapping, listId, policy: "skip" });
    expect((await liveWords(listId)).find((w) => w.english === "river")?.uzbek).toBe("daryo");
    await revertImport(admin, skip.jobId);
    const upd = await runImport(admin, { text: changed, mapping: p3.mapping, listId, policy: "update" });
    expect((await liveWords(listId)).find((w) => w.english === "river")?.uzbek).toBe("soy");
    await revertImport(admin, upd.jobId);
    const after = await liveWords(listId);
    expect(after.map((w) => [w.english, w.uzbek]).sort()).toEqual([["river", "daryo"], ["sea", "dengiz"]]);
    await expect(revertImport(admin, upd.jobId)).rejects.toThrow();
  });

  it("undo keeps words students already studied (archived, history intact)", async () => {
    const admin = await makeUser("admin");
    const G = await makeClass("Undo");
    const s = await makeUser("student");
    await enroll(G.id, s.id);
    const r = await runImport(admin, { text: "english,uzbek\nstar,yulduz\nmoon,oy\n", mapping: ["english", "uzbek"], newList: { title: `Undo ${Date.now()}` }, classIds: [G.id], publish: true });
    const [star] = (await liveWords(r.listId)).filter((w) => w.english === "star");
    await recordReview(s, { wordId: star.id, kind: "flashcard", grade: 2 });
    const res = await revertImport(admin, r.jobId);
    expect(res).toMatchObject({ removed: 1, archived: 1 });
    expect(await liveWords(r.listId)).toHaveLength(0);
    expect(await db.select().from(schema.vocabProgress).where(eq(schema.vocabProgress.wordId, star.id))).toHaveLength(1);
  });

  it("teachers import only into their own sets and groups; failures write nothing", async () => {
    const admin = await makeUser("admin");
    const [mine, theirs] = [await makeClass("TMine"), await makeClass("TTheirs")];
    const teacher = await makeUser("teacher");
    await teach(mine.id, teacher.id);
    const adminList = await saveWordList(admin, null, { title: `Admin only ${Date.now()}` });
    const text = "english,uzbek\nwind,shamol\n";
    await expect(runImport(teacher, { text, mapping: ["english", "uzbek"], listId: adminList })).rejects.toThrow();
    const title = `Teacher set ${Date.now()}`;
    await expect(runImport(teacher, { text, mapping: ["english", "uzbek"], newList: { title }, classIds: [theirs.id] })).rejects.toThrow();
    expect(await db.select().from(schema.wordLists).where(eq(schema.wordLists.title, title))).toHaveLength(0);
    const ok = await runImport(teacher, { text, mapping: ["english", "uzbek"], newList: { title }, classIds: [mine.id] });
    expect((await listImports(teacher)).map((j) => j.id)).toContain(ok.jobId);
    expect((await listImports(teacher)).every((j) => j.author)).toBe(true);
    const student = await makeUser("student");
    await expect(previewImport(student, { text })).rejects.toThrow();
    await expect(getImport(await makeUser("teacher"), ok.jobId)).rejects.toThrow();
  });

  it("handles a large file in chunks and caps the row count", async () => {
    const admin = await makeUser("admin");
    const lines = ["english,uzbek", ...Array.from({ length: 1800 }, (_, i) => `word${i},so‘z${i}`)];
    const r = await runImport(admin, { fileName: "big.csv", base64: b64(lines.join("\n")), mapping: ["english", "uzbek"], newList: { title: `Big ${Date.now()}` } });
    expect(await liveWords(r.listId)).toHaveLength(1800);
    const huge = ["english,uzbek", ...Array.from({ length: 5100 }, (_, i) => `w${i},s${i}`)].join("\n");
    const p = await previewImport(admin, { fileName: "huge.csv", base64: b64(huge) });
    expect(p.total).toBe(5000);
    expect(p.notes.join(" ")).toMatch(/5000/);
  });
});
