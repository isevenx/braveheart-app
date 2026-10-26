/** Recurring appointments: weekly, every 2 or 3 weeks, monthly, quarterly. */
import { DateTime } from "luxon";
import { SHOP } from "./shop";

export const FREQUENCIES = [
  { id: "1w", label: "Weekly" },
  { id: "2w", label: "Every 2 wks" },
  { id: "3w", label: "Every 3 wks" },
  { id: "1m", label: "Monthly" },
  { id: "3m", label: "Quarterly" },
] as const;

export type FrequencyId = (typeof FREQUENCIES)[number]["id"];

export function isFrequency(v: unknown): v is FrequencyId {
  return FREQUENCIES.some((f) => f.id === v);
}

export function frequencyLabel(id: FrequencyId): string {
  return FREQUENCIES.find((f) => f.id === id)!.label;
}

/**
 * The n-th occurrence (0 = the anchor itself), keeping the anchor's local
 * wall-clock time across daylight-saving changes. Monthly and quarterly
 * repeats keep the same weekday-of-month (e.g. "first Tuesday"), because a
 * barber's week is planned by weekday, not by calendar date.
 */
export function occurrence(anchorISO: string, freq: FrequencyId, n: number, zone: string = SHOP.timeZone): DateTime {
  const a = DateTime.fromISO(anchorISO, { zone });
  switch (freq) {
    case "1w":
      return a.plus({ weeks: n });
    case "2w":
      return a.plus({ weeks: 2 * n });
    case "3w":
      return a.plus({ weeks: 3 * n });
    case "1m":
    case "3m": {
      const months = freq === "1m" ? n : 3 * n;
      const nth = Math.ceil(a.day / 7); // 1..5
      const target = a.plus({ months }).startOf("month");
      let d = target.set({ hour: a.hour, minute: a.minute, second: 0, millisecond: 0 });
      d = d.plus({ days: (a.weekday - d.weekday + 7) % 7 }).plus({ weeks: nth - 1 });
      // A "5th Tuesday" that doesn't exist falls back to the last one that month.
      if (d.month !== target.month) d = d.minus({ weeks: 1 });
      return d;
    }
  }
}

export function upcomingOccurrences(anchorISO: string, freq: FrequencyId, count: number, zone: string = SHOP.timeZone): DateTime[] {
  return Array.from({ length: count }, (_, i) => occurrence(anchorISO, freq, i, zone));
}

/** Occurrences after `afterMs` up to `untilMs`, skipping the anchor. */
export function occurrencesBetween(anchorISO: string, freq: FrequencyId, afterMs: number, untilMs: number, zone: string = SHOP.timeZone): DateTime[] {
  const out: DateTime[] = [];
  for (let n = 1; n < 200; n++) {
    const d = occurrence(anchorISO, freq, n, zone);
    if (d.toMillis() > untilMs) break;
    if (d.toMillis() > afterMs) out.push(d);
  }
  return out;
}
