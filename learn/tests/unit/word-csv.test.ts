import { describe, expect, it } from "vitest";
import { parseWordCsv } from "@/lib/word-csv";

describe("vocabulary CSV import", () => {
  it("reads a header file, skipping duplicates within the file and against the list", () => {
    const csv = "english,uzbek,example\nbook,kitob,I read a book.\nApple,olma,\nbook,kitob,\nwater,suv,\n";
    const r = parseWordCsv(csv, ["WATER"]);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.english)).toEqual(["book", "Apple"]);
    expect(r.duplicates).toEqual(["book", "water"]);
    expect(r.rows[0].example).toBe("I read a book.");
  });
  it("accepts two columns without a header and reports invalid lines", () => {
    expect(parseWordCsv("run,yugurmoq\nswim,suzmoq").rows).toHaveLength(2);
    const bad = parseWordCsv("english,uzbek,difficulty\nrun,,2\njump,sakramoq,9\n");
    expect(bad.errors.map((e) => e.line)).toEqual([2, 3]);
  });
});
