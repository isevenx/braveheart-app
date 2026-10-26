import { describe, expect, it } from "vitest";
import { occurrence, upcomingOccurrences } from "./recurrence";

const Z = "America/Los_Angeles";
const fmt = "ccc yyyy-LL-dd HH:mm";

describe("recurrence", () => {
  const anchor = "2026-11-03T18:00:00-08:00"; // first Tuesday of November, 6 PM

  it("repeats every 3 weeks at the same local time", () => {
    const d = upcomingOccurrences(anchor, "3w", 3, Z).map((x) => x.toFormat(fmt));
    expect(d).toEqual(["Tue 2026-11-03 18:00", "Tue 2026-11-24 18:00", "Tue 2026-12-15 18:00"]);
  });

  it("monthly keeps the weekday-of-month (first Tuesday)", () => {
    const d = upcomingOccurrences(anchor, "1m", 3, Z).map((x) => x.toFormat(fmt));
    expect(d).toEqual(["Tue 2026-11-03 18:00", "Tue 2026-12-01 18:00", "Tue 2027-01-05 18:00"]);
  });

  it("quarterly jumps three months", () => {
    expect(occurrence(anchor, "3m", 1, Z).toFormat(fmt)).toBe("Tue 2027-02-02 18:00");
  });

  it("keeps 6 PM local across daylight saving", () => {
    const oct = "2026-10-27T18:00:00-07:00"; // PDT
    expect(occurrence(oct, "1w", 1, Z).toFormat("HH:mm ZZ")).toBe("18:00 -08:00"); // PST
  });

  it("a missing 5th weekday falls back to the last one", () => {
    const fifthThu = "2026-10-29T12:00:00-07:00"; // 5th Thursday of Oct
    expect(occurrence(fifthThu, "1m", 1, Z).toFormat("yyyy-LL-dd")).toBe("2026-11-26"); // 4th (last) Thu of Nov
  });
});
