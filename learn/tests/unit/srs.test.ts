import { describe, expect, it } from "vitest";
import { matchesAnswer, schedule, type SrsState } from "@/lib/srs";

const now = new Date("2026-10-22T08:00:00Z");
const days = (d: Date) => (d.getTime() - now.getTime()) / 86_400_000;

describe("spaced repetition", () => {
  it("never masters a word after one correct answer", () => {
    const s = schedule(null, 3, now);
    expect(s.state).toBe("review");
    expect(s.reps).toBe(1);
  });
  it("grows intervals with consecutive successes and masters only after weeks", () => {
    let s: SrsState = schedule(null, 2, now);
    expect(days(schedule(null, 2, now).dueAt)).toBe(1);
    const seen: number[] = [s.intervalDays];
    for (let i = 0; i < 4; i++) {
      s = schedule(s, 2, now);
      seen.push(s.intervalDays);
    }
    expect(seen).toEqual([1, 3, 7.5, 18.8, 47]);
    expect(s.state).toBe("mastered");
  });
  it("a lapse resets the streak, lowers ease and brings the word back soon", () => {
    const good = schedule(schedule(schedule(null, 2, now), 2, now), 2, now);
    const lapse = schedule(good, 0, now);
    expect(lapse.reps).toBe(0);
    expect(lapse.lapses).toBe(1);
    expect(lapse.ease).toBeLessThan(good.ease);
    expect(lapse.state).toBe("learning");
    expect((lapse.dueAt.getTime() - now.getTime()) / 60_000).toBe(10);
  });
  it("hard answers grow slowly; ease stays within bounds", () => {
    let s = schedule(null, 1, now);
    for (let i = 0; i < 20; i++) s = schedule(s, 1, now);
    expect(s.ease).toBe(1.3);
    let e = schedule(null, 3, now);
    for (let i = 0; i < 20; i++) e = schedule(e, 3, now);
    expect(e.ease).toBe(3);
    expect(e.intervalDays).toBeLessThanOrEqual(365);
  });
  it("accepts any listed translation and tolerates case/punctuation", () => {
    expect(matchesAnswer("Kitob", "kitob, daftar")).toBe(true);
    expect(matchesAnswer("daftar", "kitob, daftar")).toBe(true);
    expect(matchesAnswer("color", "colour / color")).toBe(true);
    expect(matchesAnswer("look after.", "look after")).toBe(true);
    expect(matchesAnswer("", "x")).toBe(false);
    expect(matchesAnswer("book", "kitob")).toBe(false);
  });
});
