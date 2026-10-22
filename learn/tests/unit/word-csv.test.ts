import { describe, expect, it } from "vitest";
import { parseWordCsv, parseWordList } from "@/lib/word-csv";

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

describe("quick word list entry", () => {
  it("reads the usual teacher formats line by line", () => {
    const r = parseWordList(
      [
        "1. journey - sayohat, safar",
        "2) luggage — yuk",
        "• souvenir: esdalik sovg‘a",
        "destination = manzil",
        "look after (phr v) - g‘amxo‘rlik qilmoq",
        "abroad /əˈbrɔːd/ – chet elda | She has never been abroad. | U hech qachon chet elda bo‘lmagan.",
        "well-known - mashhur",
        "passport\tpasport\tShow your passport.",
        "",
        "journey - sayohat",
        "nothing here",
      ].join("\n"),
      ["Destination"],
    );
    expect(r.rows.map((x) => [x.english, x.uzbek])).toEqual([
      ["journey", "sayohat, safar"],
      ["luggage", "yuk"],
      ["souvenir", "esdalik sovg‘a"],
      ["look after", "g‘amxo‘rlik qilmoq"],
      ["abroad", "chet elda"],
      ["well-known", "mashhur"],
      ["passport", "pasport"],
    ]);
    expect(r.rows[3].partOfSpeech).toBe("phr v");
    expect(r.rows[4]).toMatchObject({ phonetic: "/əˈbrɔːd/", example: "She has never been abroad.", exampleUz: "U hech qachon chet elda bo‘lmagan." });
    expect(r.rows[6].example).toBe("Show your passport.");
    expect(r.duplicates).toEqual(["destination", "journey"]);
    expect(r.errors.map((e) => e.line)).toEqual([11]);
  });
  it("can read lines written Uzbek first, and still accepts CSV with a header", () => {
    expect(parseWordList("kitob - book", [], true).rows[0]).toMatchObject({ english: "book", uzbek: "kitob" });
    expect(parseWordList("english,uzbek\nbook,kitob").rows[0]).toMatchObject({ english: "book", uzbek: "kitob" });
  });
});
