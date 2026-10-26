/**
 * Sample calendars for demo mode, shaped like the design mockups:
 * a customer who works weekdays, plus a wedding about two weeks out.
 */
import { DateTime } from "luxon";
import type { Interval } from "./availability";
import type { CalendarEventLite } from "./big-events";
import { BARBERS, SHOP } from "./shop";

const Z = SHOP.timeZone;

function block(day: DateTime, from: number, to: number): Interval {
  const at = (h: number) => day.set({ hour: Math.floor(h), minute: (h % 1) * 60, second: 0, millisecond: 0 }).toMillis();
  return { start: at(from), end: at(to) };
}

function eachDay(range: Interval, fn: (d: DateTime, i: number) => void) {
  let d = DateTime.fromMillis(range.start, { zone: Z }).startOf("day");
  for (let i = 0; d.toMillis() < range.end; i++, d = d.plus({ days: 1 })) fn(d, i);
}

/** Saturday 12–18 days after `now`: the sample wedding. */
export function demoWeddingDay(now: number): DateTime {
  let d = DateTime.fromMillis(now, { zone: Z }).startOf("day").plus({ days: 12 });
  while (d.weekday !== 6) d = d.plus({ days: 1 });
  return d;
}

export function demoUserBusy(range: Interval, now: number): Interval[] {
  const out: Interval[] = [];
  const wedding = demoWeddingDay(now).toISODate();
  eachDay(range, (d, i) => {
    if (d.weekday <= 5) {
      // Work most of the day; the free window moves around through the week.
      const pattern = [
        [[10, 16]],
        [[10, 12], [13, 16.5]],
        [[10, 14.5], [15, 16]],
        [[11, 15]],
        [[10, 12.5], [14, 17]],
      ][(d.weekday - 1 + i) % 5];
      for (const [a, b] of pattern) out.push(block(d, a, b));
      if (i % 2) out.push(block(d, 18, 19)); // gym
    } else if (d.weekday === 6) {
      if (d.toISODate() === wedding) out.push(block(d, 11.5, 15));
      else out.push(block(d, 13.5, 15)); // kids' soccer
    }
  });
  return out;
}

export function demoBarberBusy(range: Interval, barberId: string): Interval[] {
  const out: Interval[] = [];
  const seed = BARBERS.findIndex((b) => b.id === barberId) + 1;
  eachDay(range, (d, i) => {
    const k = (i + seed * 3) % 4;
    if (k === 0) out.push(block(d, 10, 11.5), block(d, 16.5, 17.5));
    if (k === 1) out.push(block(d, 12, 13), block(d, 17.5, 19));
    if (k === 2) out.push(block(d, 10.5, 12), block(d, 15, 16));
    if (k === 3) out.push(block(d, 13, 14.5));
  });
  return out;
}

export function demoEvents(now: number): CalendarEventLite[] {
  const w = demoWeddingDay(now).set({ hour: 13, minute: 30 });
  return [
    { id: "demo-wedding", title: "Sam & Priya's Wedding", start: w.toISO()! },
    { id: "demo-standup", title: "Team standup", start: DateTime.fromMillis(now, { zone: Z }).plus({ days: 1 }).set({ hour: 10 }).toISO()! },
  ];
}
