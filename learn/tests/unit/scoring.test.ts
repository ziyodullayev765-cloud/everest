import { describe, expect, it } from "vitest";
import { countBlanks, normalizeText, scoreQuestion, seededShuffle, type ScorableQuestion } from "@/lib/scoring";

const opt = (id: string, isCorrect = false) => ({ id, isCorrect });
const q = (over: Partial<ScorableQuestion>): ScorableQuestion => ({ id: "q", type: "single_choice", points: 2, config: {}, options: [], ...over });

describe("scoreQuestion", () => {
  it("single choice: only the correct option scores", () => {
    const s = q({ options: [opt("a"), opt("b", true)] });
    expect(scoreQuestion(s, { optionId: "b" })).toEqual({ isCorrect: true, points: 2, needsManual: false });
    expect(scoreQuestion(s, { optionId: "a" }).points).toBe(0);
    expect(scoreQuestion(s, null).points).toBe(0);
    expect(scoreQuestion(s, { optionIds: ["b"] }).points).toBe(0);
  });
  it("multiple choice is all-or-nothing", () => {
    const s = q({ type: "multiple_choice", options: [opt("a", true), opt("b", true), opt("c")] });
    expect(scoreQuestion(s, { optionIds: ["b", "a"] }).isCorrect).toBe(true);
    expect(scoreQuestion(s, { optionIds: ["a"] }).isCorrect).toBe(false);
    expect(scoreQuestion(s, { optionIds: ["a", "b", "c"] }).isCorrect).toBe(false);
  });
  it("short answer normalises case, whitespace and apostrophes", () => {
    const s = q({ type: "short_answer", config: { accepted: [["O‘zbekiston", "Uzbekistan"]] } });
    expect(scoreQuestion(s, { text: "  o'zbekiston " }).isCorrect).toBe(true);
    expect(scoreQuestion(s, { text: "UZBEKISTAN" }).isCorrect).toBe(true);
    expect(scoreQuestion(s, { text: "Qozog‘iston" }).isCorrect).toBe(false);
    expect(scoreQuestion(s, { text: "" }).isCorrect).toBe(false);
  });
  it("short answer without accepted answers needs manual grading", () => {
    expect(scoreQuestion(q({ type: "short_answer", config: {} }), { text: "x" }).needsManual).toBe(true);
    expect(scoreQuestion(q({ type: "essay" }), { text: "x" }).needsManual).toBe(true);
  });
  it("case-sensitive short answers", () => {
    const s = q({ type: "short_answer", config: { accepted: [["NaCl"]], caseSensitive: true } });
    expect(scoreQuestion(s, { text: "nacl" }).isCorrect).toBe(false);
    expect(scoreQuestion(s, { text: "NaCl" }).isCorrect).toBe(true);
  });
  it("fill in the blank gives partial credit per blank", () => {
    const s = q({ type: "fill_blank", points: 3, config: { accepted: [["2"], ["4", "to‘rt"], ["8"]] } });
    expect(scoreQuestion(s, { blanks: ["2", "to'rt", "9"] })).toEqual({ isCorrect: false, points: 2, needsManual: false });
    expect(scoreQuestion(s, { blanks: ["2", "4", "8"] }).isCorrect).toBe(true);
  });
  it("matching gives partial credit per pair", () => {
    const s = q({ type: "matching", points: 4, config: { pairs: [{ id: "x", left: "a", right: "1" }, { id: "y", left: "b", right: "2" }] } });
    expect(scoreQuestion(s, { matches: { x: "x", y: "x" } }).points).toBe(2);
    expect(scoreQuestion(s, { matches: { x: "x", y: "y" } }).isCorrect).toBe(true);
  });
});

describe("helpers", () => {
  it("counts blanks", () => expect(countBlanks("2 + ___ = ____ and _")).toBe(2));
  it("normalises text", () => expect(normalizeText("  Ab  C ")).toBe("ab c"));
  it("seeded shuffle is deterministic and a permutation", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6], "seed");
    expect(seededShuffle([1, 2, 3, 4, 5, 6], "seed")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("English question types", () => {
  it("arrange words: the assembled sentence must match, trailing punctuation ignored", () => {
    const s = q({ type: "arrange_words", config: { words: ["I", "have", "never", "been", "there"], accepted: [["I have never been there", "Never have I been there"]] } });
    expect(scoreQuestion(s, { text: "I have never been there." }).isCorrect).toBe(true);
    expect(scoreQuestion(s, { text: "never have i been there" }).isCorrect).toBe(true);
    expect(scoreQuestion(s, { text: "I never have been there" }).isCorrect).toBe(false);
  });
  it("translation and grammar correction compare sentences; no key means manual review", () => {
    const tr = q({ type: "translation", config: { accepted: [["I am a student"]], direction: "uz_en" } });
    expect(scoreQuestion(tr, { text: "i am a student." }).isCorrect).toBe(true);
    expect(scoreQuestion(q({ type: "translation", config: { accepted: [[]] } }), { text: "x" }).needsManual).toBe(true);
    const gc = q({ type: "grammar_correction", config: { incorrect: "She don't like it.", accepted: [["She doesn't like it", "She does not like it"]] } });
    expect(scoreQuestion(gc, { text: "She does not like it." }).isCorrect).toBe(true);
    expect(scoreQuestion(gc, { text: "She don't like it." }).isCorrect).toBe(false);
  });
  it("irregular verbs give partial credit per form", () => {
    const s = q({ type: "irregular_verb", points: 2, config: { base: "be", accepted: [["was", "were"], ["been"]] } });
    expect(scoreQuestion(s, { blanks: ["were", "been"] })).toEqual({ isCorrect: true, points: 2, needsManual: false });
    expect(scoreQuestion(s, { blanks: ["was", "beed"] }).points).toBe(1);
  });
});
