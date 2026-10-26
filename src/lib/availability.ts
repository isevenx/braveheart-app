/**
 * The core of the app: overlay the customer's busy times on each barber's busy
 * times and return only the chair slots the customer can actually make.
 * Pure functions (no I/O), so they are unit-tested in availability.test.ts.
 */
import { DateTime } from "luxon";
import { HOURS, SHOP } from "./shop";

export type Interval = { start: number; end: number }; // epoch ms, end exclusive

export type Slot = {
  /** ISO start in the shop's time zone, e.g. 2026-10-22T16:30:00.000-07:00 */
  start: string;
  /** "4:30 PM" */
  label: string;
  /** "16:30" — stable id used in URLs */
  time: string;
  /** Barbers free for the whole service at this time. */
  barberIds: string[];
};

export type DaySummary = {
  date: string; // yyyy-MM-dd
  weekday: string; // "Thu"
  dayOfMonth: number;
  monthShort: string; // "Oct"
  isFirstOfMonth: boolean;
  closed: boolean;
  fitCount: number;
  longLabel: string; // "Thu, Oct 22"
};

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function isFree(slot: Interval, busy: Interval[]): boolean {
  return !busy.some((b) => overlaps(slot, b));
}

/** Opening hours for a date in the shop zone, or null if closed. */
export function shopHoursFor(date: string, zone: string = SHOP.timeZone): Interval | null {
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid) return null;
  const hours = HOURS[day.weekday];
  if (!hours) return null;
  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);
  return {
    start: day.set({ hour: oh, minute: om, second: 0, millisecond: 0 }).toMillis(),
    end: day.set({ hour: ch, minute: cm, second: 0, millisecond: 0 }).toMillis(),
  };
}

export type SlotInput = {
  date: string; // yyyy-MM-dd in shop zone
  durationMinutes: number;
  /** Busy blocks per barber id. Only barbers listed here are considered. */
  barberBusy: Record<string, Interval[]>;
  /** The customer's busy blocks (from their Google Calendar). */
  userBusy: Interval[];
  now: number;
  zone?: string;
  stepMinutes?: number;
  minNoticeMinutes?: number;
};

export function computeSlots(input: SlotInput): Slot[] {
  const zone = input.zone ?? SHOP.timeZone;
  const step = (input.stepMinutes ?? SHOP.slotStepMinutes) * 60_000;
  const dur = input.durationMinutes * 60_000;
  const earliest = input.now + (input.minNoticeMinutes ?? SHOP.minNoticeMinutes) * 60_000;
  const hours = shopHoursFor(input.date, zone);
  if (!hours) return [];

  const slots: Slot[] = [];
  for (let t = hours.start; t + dur <= hours.end; t += step) {
    if (t < earliest) continue;
    const window: Interval = { start: t, end: t + dur };
    if (!isFree(window, input.userBusy)) continue;
    const barberIds = Object.entries(input.barberBusy)
      .filter(([, busy]) => isFree(window, busy))
      .map(([id]) => id);
    if (barberIds.length === 0) continue;
    const dt = DateTime.fromMillis(t, { zone });
    slots.push({
      start: dt.toISO()!,
      label: dt.toFormat("h:mm a"),
      time: dt.toFormat("HH:mm"),
      barberIds,
    });
  }
  return slots;
}

/** The dates shown in the day strip, starting today in the shop zone. */
export function bookingDates(now: number, days: number = SHOP.bookingWindowDays, zone: string = SHOP.timeZone): string[] {
  const start = DateTime.fromMillis(now, { zone }).startOf("day");
  return Array.from({ length: days }, (_, i) => start.plus({ days: i }).toISODate()!);
}

export function describeDay(date: string, fitCount: number, zone: string = SHOP.timeZone): DaySummary {
  const d = DateTime.fromISO(date, { zone });
  return {
    date,
    weekday: d.toFormat("ccc"),
    dayOfMonth: d.day,
    monthShort: d.toFormat("LLL"),
    isFirstOfMonth: d.day === 1,
    closed: shopHoursFor(date, zone) === null,
    fitCount,
    longLabel: d.toFormat("ccc, LLL d"),
  };
}

/** Range covering the whole booking window, for one freebusy query. */
export function windowRange(now: number, days: number = SHOP.bookingWindowDays, zone: string = SHOP.timeZone): Interval {
  const start = DateTime.fromMillis(now, { zone }).startOf("day");
  return { start: start.toMillis(), end: start.plus({ days }).toMillis() };
}

/** Parse "16:30" on a date into an epoch-ms interval for a service. */
export function slotInterval(date: string, time: string, durationMinutes: number, zone: string = SHOP.timeZone): Interval | null {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) return null;
  return { start: dt.toMillis(), end: dt.toMillis() + durationMinutes * 60_000 };
}
