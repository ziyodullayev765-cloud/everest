import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db";
import { saveAssignment, getForStudent, listForStudent } from "@/server/services/assignments";
import { saveDraft, submitWork } from "@/server/services/submissions";
import { gradingContext, gradeSubmission } from "@/server/services/grades";
import { getBook, listBooks, saveBook, setBookStatus } from "@/server/services/library";
import { authorizeFileRead, openFile, sniff, storeFile } from "@/server/services/files";
import { baseAssignment, world } from "./fixtures";

afterAll(async () => closeDb());

const err = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error("expected rejection");
};

const ITEMS = [
  { id: "r1", kind: "reading", title: "Barron's Reading", range: "Passage 1-2" },
  { id: "v1", kind: "vocabulary", title: "B2 unit" },
  { id: "l1", kind: "listening", title: "Basic Listening", range: "18-betgacha" },
  { id: "t1", kind: "translation", title: "Text translation" },
  { id: "b1", kind: "tapescript", title: "BBC tapescript" },
];

describe("homework lists", () => {
  it("students tick items, write texts, submit; teacher sees progress and grades", async () => {
    const w = await world();
    expect((await err(saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "homework", items: [] })))).code).toBe("invalid");
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "homework", items: ITEMS }));
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("new");

    // Nothing ticked → can't submit.
    expect((await err(submitWork(w.student, id, { itemProgress: {} }))).code).toBe("invalid");

    await saveDraft(w.student, id, { itemProgress: { r1: { done: true }, fake: { done: true } } });
    const draft = await getForStudent(w.student.id, id);
    expect(draft.submission?.itemProgress).toEqual({ r1: { done: true } }); // unknown item ids dropped
    expect(draft.status).toBe("in_progress");

    const r = await submitWork(w.student, id, {
      content: "Hammasi bajarildi",
      itemProgress: { r1: { done: true }, v1: { done: true }, l1: { done: false }, t1: { done: true, text: "Men kitob o‘qiyman." }, b1: { done: true, text: "Good evening, this is the BBC…" } },
    });
    expect(r.version).toBe(1);
    const ctx = await gradingContext(w.teacher, id, w.student.id);
    expect(ctx.versions[0].itemProgress.t1).toEqual({ done: true, text: "Men kitob o‘qiyman." });
    expect(ctx.versions[0].itemProgress.l1.done).toBe(false);
    await gradeSubmission(w.teacher, id, w.student.id, { points: 8, finalize: true, feedback: "Listening qoldi" });
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("graded");
  });

  it("rejects homework items pointing at a missing book", async () => {
    const w = await world();
    const bad = [{ id: "x", kind: "reading", title: "X", bookId: "00000000-0000-4000-8000-000000000000" }];
    expect((await err(saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "homework", items: bad })))).code).toBe("invalid");
  });
});

describe("library", () => {
  const pdf = () => new File([Buffer.from("%PDF-1.7\n%book\n")], "barrons.pdf", { type: "application/pdf" });
  const png = () => new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], "cover.png", { type: "image/png" });
  const mp3 = () => new File([Buffer.concat([Buffer.from("ID3"), Buffer.alloc(300, 7)])], "track01.mp3", { type: "audio/mpeg" });

  it("admins manage books; everyone signed in reads published ones only", async () => {
    const w = await world();
    const [p, c, a] = [await storeFile(w.admin, pdf()), await storeFile(w.admin, png(), { imagesOnly: true }), await storeFile(w.admin, mp3())];
    expect(a.mime).toBe("audio/mpeg");
    expect((await err(saveBook(w.teacher, null, { title: "Teacher book" }))).code).toBe("forbidden");
    expect((await err(saveBook(w.student, null, { title: "Student book" }))).code).toBe("forbidden");
    // Wrong file kinds are refused.
    expect((await err(saveBook(w.admin, null, { title: "Bad", pdfFileId: c.id }))).code).toBe("invalid");
    expect((await err(saveBook(w.admin, null, { title: "Bad", audio: [{ title: "x", fileId: p.id }] }))).code).toBe("invalid");

    const id = await saveBook(w.admin, null, { title: "Barron's Reading", category: "reading", level: "B2", coverFileId: c.id, pdfFileId: p.id, audio: [{ title: "Track 1", fileId: a.id }], status: "draft" });
    expect((await listBooks(w.student)).map((b) => b.id)).not.toContain(id);
    expect((await err(getBook(w.student, id))).code).toBe("not_found");
    await expect(authorizeFileRead(w.otherStudent, p.id)).rejects.toThrow();

    await setBookStatus(w.admin, id, "published");
    const listed = (await listBooks(w.student)).find((b) => b.id === id)!;
    expect(listed.audioCount).toBe(1);
    const view = await getBook(w.otherStudent, id);
    expect(view.audio[0].title).toBe("Track 1");
    await expect(authorizeFileRead(w.otherStudent, p.id)).resolves.toBeTruthy();
    await expect(authorizeFileRead(w.otherStudent, a.id)).resolves.toBeTruthy();
    await expect(authorizeFileRead(null, p.id)).rejects.toThrow(); // signed-out visitors: no

    // Admins can't attach someone else's private upload to a book.
    const foreign = await storeFile(w.student, pdf());
    expect((await err(saveBook(w.admin, id, { title: "Barron's Reading", pdfFileId: foreign.id }))).code).toBe("invalid");

    // Homework can link to the book.
    const { id: hw } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "homework", items: [{ id: "r", kind: "reading", title: "Barron's", bookId: id, range: "Passage 1-2" }] }));
    expect((await getForStudent(w.student.id, hw)).books.map((b) => b.id)).toEqual([id]);
  });
});

describe("files", () => {
  it("detects audio types from bytes, not names", () => {
    expect(sniff(Buffer.from("ID3\x03\x00"), "a.mp3")?.mime).toBe("audio/mpeg");
    expect(sniff(Buffer.from([0xff, 0xfb, 0x90, 0x00]), "a.mp3")?.mime).toBe("audio/mpeg");
    expect(sniff(Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypM4A ")]), "a.m4a")?.mime).toBe("audio/mp4");
    expect(sniff(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE")]), "a.wav")?.mime).toBe("audio/wav");
    expect(sniff(Buffer.from("OggS\x00"), "a.ogg")?.mime).toBe("audio/ogg");
    expect(sniff(Buffer.from("<html>"), "a.mp3")).toBeNull();
  });

  it("serves byte ranges so audio can seek", async () => {
    const w = await world();
    const a = await storeFile(w.admin, new File([Buffer.concat([Buffer.from("ID3"), Buffer.from("0123456789")])], "t.mp3"));
    const row = await authorizeFileRead(w.admin, a.id);
    const full = await openFile(row, null);
    expect(full.status).toBe(200);
    const part = await openFile(row, "bytes=3-6");
    expect(part.status).toBe(206);
    expect(part.headers["Content-Range"]).toBe("bytes 3-6/13");
    expect(Buffer.from(part.body as Uint8Array).toString()).toBe("0123");
    const tail = await openFile(row, "bytes=-2");
    expect(Buffer.from(tail.body as Uint8Array).toString()).toBe("89");
    expect((await openFile(row, "bytes=50-60")).status).toBe(416);
  });
});
