import { describe, expect, it } from "vitest";
import { parseQuestionCsv, QUESTION_CSV_EXAMPLE } from "@/lib/question-csv";
import { questionsInput } from "@/lib/validation/assignment";

describe("question CSV import", () => {
  it("parses the bundled example and every row passes server validation", () => {
    const r = parseQuestionCsv(QUESTION_CSV_EXAMPLE);
    expect(r.errors).toEqual([]);
    expect(r.questions.map((q) => q.type)).toEqual(["single_choice", "true_false", "fill_blank", "translation", "grammar_correction", "arrange_words", "irregular_verb", "matching", "essay"]);
    const v = questionsInput.safeParse(r.questions.map((q) => ({ ...q, imageFileId: null })));
    expect(v.success).toBe(true);
    expect(r.questions[0].options.find((o) => o.isCorrect)?.label).toBe("goes");
    expect(r.questions[6].accepted).toEqual([["went"], ["gone"]]);
  });
  it("reports problems per line instead of importing broken rows", () => {
    const r = parseQuestionCsv("type,prompt,points,options,answers\nsingle_choice,Pick one,1,a|b,\nfoo,Hi,1,,\nfill_blank,No blanks here,1,,x\n");
    expect(r.questions).toHaveLength(0);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4]);
  });
  it("requires the header row", () => {
    expect(parseQuestionCsv("single_choice,Q,1,*a|b").errors[0].line).toBe(1);
  });
});
