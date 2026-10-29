import { describe, expect, it } from "vitest";
import { detectDelimiter, parseDelimited, readTable } from "@/server/import/table";
import { guessMapping, looksLikeHeader, rowToWord } from "@/lib/vocab-import";

const enc = (s: string) => new TextEncoder().encode(s);

describe("vocabulary file reading", () => {
  it("detects the delimiter and keeps commas inside quoted or semicolon-separated cells", () => {
    expect(detectDelimiter("english;uzbek\nbook;kitob, daftar")).toBe(";");
    expect(detectDelimiter("english\tuzbek\nbook\tkitob")).toBe("\t");
    expect(detectDelimiter('english,uzbek\nbook,"kitob, daftar"')).toBe(",");
    expect(parseDelimited('a,"b, c","say ""hi"""\n\nd,e,f', ",").map((r) => r.cells)).toEqual([["a", "b, c", 'say "hi"'], ["d", "e", "f"]]);
    expect(parseDelimited('a,"multi\nline"\nb,c', ",").map((r) => r.line)).toEqual([1, 3]);
  });

  it("reads UTF-8 with BOM and falls back to Windows-1251 with a note", () => {
    const t = readTable("w.csv", enc("﻿English,Uzbek\nbook,kitob\n"), looksLikeHeader);
    expect(t.headers).toEqual(["English", "Uzbek"]);
    const cp1251 = new Uint8Array([0x77, 0x6f, 0x72, 0x6c, 0x64, 0x2c, 0xea, 0xe8, 0xf2, 0xee, 0xe1, 0x0a]); // world,китоб
    const t2 = readTable("w.csv", cp1251, looksLikeHeader);
    expect(t2.rows[0].cells).toEqual(["world", "китоб"]);
    expect(readTable("w.csv", enc("word,kitob\nbook,daftar"), looksLikeHeader).rows).toHaveLength(2);
    expect(t2.notes.length).toBe(1);
  });

  it("recognises many header spellings and maps unknown files by position", () => {
    expect(guessMapping(["Term", "Meaning", "Example sentence", "POS", "Lesson", "Level", "Tags"])).toEqual(["english", "uzbek", "example", "partOfSpeech", "unit", "difficulty", "tags"]);
    expect(guessMapping(["Vocabulary", "Tarjima", "Talaffuz", "Sinonimlar"])).toEqual(["english", "uzbek", "phonetic", "synonyms"]);
    expect(guessMapping(["Слово", "Перевод"])).toEqual(["english", "uzbek"]);
    expect(guessMapping(["Col A", "Col B"])).toEqual(["english", "uzbek"]);
  });

  it("validates rows with clear messages", () => {
    const m = guessMapping(["english", "uzbek", "difficulty"]);
    expect(rowToWord(["book", "kitob", "hard"], m, 2).word?.difficulty).toBe(3);
    expect(rowToWord(["book", "", ""], m, 3).error).toMatch(/Tarjima/);
    expect(rowToWord(["book", "kitob", "very"], m, 4).error).toMatch(/Qiyinlik/);
    expect(rowToWord(["x".repeat(200), "kitob", ""], m, 5).error).toBeTruthy();
  });

  it("reads the quick TXT format line by line, keeping line numbers and errors", () => {
    const t = readTable("w.txt", enc("journey - sayohat\n\nno separator here\nbook — kitob | I read a book."), looksLikeHeader);
    expect(t.rows.map((r) => [r.line, r.cells[0], r.error ? "err" : "ok"])).toEqual([[1, "journey", "ok"], [3, "", "err"], [4, "book", "ok"]]);
  });

  it("rejects unsupported and empty files", () => {
    expect(() => readTable("w.xls", enc("x"), looksLikeHeader)).toThrow(/xlsx/);
    expect(() => readTable("w.docx", enc("x"), looksLikeHeader)).toThrow();
    expect(() => readTable("w.csv", new Uint8Array(), looksLikeHeader)).toThrow();
  });
});
