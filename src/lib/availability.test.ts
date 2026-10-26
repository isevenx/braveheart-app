import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { bookingDates, computeSlots, shopHoursFor, slotInterval } from "./availability";

const Z = "America/Los_Angeles";
const at = (iso: string) => DateTime.fromISO(iso, { zone: Z }).toMillis();
const block = (a: string, b: string) => ({ start: at(a), end: at(b) });
// A Monday morning, well before the dates under test.
const NOW = at("2026-10-19T08:00");

describe("shopHoursFor", () => {
  it("is closed on Sunday", () => {
    expect(shopHoursFor("2026-10-25", Z)).toBeNull();
  });
  it("closes at 3 PM on Saturday", () => {
    const h = shopHoursFor("2026-10-24", Z)!;
    expect(DateTime.fromMillis(h.end, { zone: Z }).toFormat("HH:mm")).toBe("15:00");
  });
});

describe("computeSlots", () => {
  it("only returns times the customer is free", () => {
    const slots = computeSlots({
      date: "2026-10-22",
      durationMinutes: 60,
      barberBusy: { jared: [] },
      userBusy: [block("2026-10-22T10:00", "2026-10-22T16:00")],
      now: NOW,
      zone: Z,
    });
    expect(slots[0].time).toBe("16:00");
    expect(slots.map((s) => s.time)).not.toContain("15:30"); // 15:30–16:30 overlaps work
    expect(slots.at(-1)!.time).toBe("18:00"); // last 60-min slot before 7 PM close
  });

  it("drops a slot when every barber is booked, keeps it if one is free", () => {
    const busy = [block("2026-10-22T16:00", "2026-10-22T17:00")];
    const allBusy = computeSlots({ date: "2026-10-22", durationMinutes: 45, barberBusy: { jared: busy, camilo: busy }, userBusy: [], now: NOW, zone: Z });
    expect(allBusy.map((s) => s.time)).not.toContain("16:00");
    const oneFree = computeSlots({ date: "2026-10-22", durationMinutes: 45, barberBusy: { jared: busy, camilo: [] }, userBusy: [], now: NOW, zone: Z });
    const s = oneFree.find((x) => x.time === "16:00")!;
    expect(s.barberIds).toEqual(["camilo"]);
  });

  it("respects the service length at closing time", () => {
    const slots = computeSlots({ date: "2026-10-24", durationMinutes: 75, barberBusy: { jared: [] }, userBusy: [], now: NOW, zone: Z });
    expect(slots.at(-1)!.time).toBe("13:30"); // 13:30 + 75 min = 14:45, 14:00 + 75 = 15:15 > 15:00
  });

  it("enforces minimum notice", () => {
    const now = at("2026-10-22T13:10");
    const slots = computeSlots({ date: "2026-10-22", durationMinutes: 30, barberBusy: { jared: [] }, userBusy: [], now, zone: Z, minNoticeMinutes: 60 });
    expect(slots[0].time).toBe("14:30");
  });

  it("returns nothing on a closed day", () => {
    expect(computeSlots({ date: "2026-10-25", durationMinutes: 30, barberBusy: { jared: [] }, userBusy: [], now: NOW, zone: Z })).toEqual([]);
  });

  it("keeps local times across the DST change", () => {
    // US daylight saving ends Sunday Nov 1 2026; Monday Nov 2 still opens at 10:00 local.
    const slots = computeSlots({ date: "2026-11-02", durationMinutes: 30, barberBusy: { jared: [] }, userBusy: [], now: NOW, zone: Z });
    expect(slots[0].time).toBe("10:00");
    expect(slots[0].start).toContain("-08:00");
  });
});

describe("helpers", () => {
  it("lists booking dates from today", () => {
    const d = bookingDates(NOW, 3, Z);
    expect(d).toEqual(["2026-10-19", "2026-10-20", "2026-10-21"]);
  });
  it("builds a slot interval", () => {
    const i = slotInterval("2026-10-22", "16:30", 60, Z)!;
    expect(i.end - i.start).toBe(3_600_000);
  });
});
