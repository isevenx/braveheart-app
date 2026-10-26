import { describe, expect, it } from "vitest";
import { detectBigEvents, detectByKeywords } from "./big-events";

const ev = (id: string, title: string) => ({ id, title, start: "2026-11-07T13:30:00-08:00" });

describe("big event keyword fallback", () => {
  it("flags weddings, interviews and photoshoots, ignores routine events", () => {
    const found = detectByKeywords([
      ev("1", "Sam & Priya's Wedding"),
      ev("2", "Interview at Qualcomm"),
      ev("3", "Team standup"),
      ev("4", "Headshots w/ photographer"),
      ev("5", "Gym"),
    ]);
    expect(found.map((f) => [f.id, f.kind])).toEqual([
      ["1", "wedding"],
      ["2", "interview"],
      ["4", "photoshoot"],
    ]);
  });

  it("uses the fallback when no API key is set", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const found = await detectBigEvents([ev("1", "Prom night"), ev("2", "Dentist")]);
    expect(found).toHaveLength(1);
    process.env.ANTHROPIC_API_KEY = prev;
  });
});
