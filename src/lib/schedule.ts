import "server-only";
import { DateTime } from "luxon";
import {
  bookingDates,
  computeSlots,
  describeDay,
  windowRange,
  type DaySummary,
  type Interval,
  type Slot,
} from "./availability";
import { demoBarberBusy, demoUserBusy, demoWeddingDay } from "./demo";
import { isDemo } from "./env";
import { BARBERS, SHOP, barberCalendarId, getService, DEFAULT_SERVICE_ID } from "./shop";
import type { Viewer } from "./viewer";

export type Schedule = {
  days: DaySummary[];
  slotsByDate: Record<string, Slot[]>;
  /** Dates with a big event on the customer's calendar, for the strip's dot. */
  eventDates: Record<string, string>;
  rangeLabel: string;
  /** False when the shop calendars aren't configured yet (shows hours only). */
  shopLive: boolean;
};

/** Busy blocks per barber: their Google Calendar plus bookings made in the app. */
export async function barberBusy(range: Interval, now: number): Promise<Record<string, Interval[]>> {
  if (isDemo) return Object.fromEntries(BARBERS.map((b) => [b.id, demoBarberBusy(range, b.id)]));

  const out: Record<string, Interval[]> = Object.fromEntries(BARBERS.map((b) => [b.id, []]));
  const { shopCalendar, freeBusy } = await import("./google");
  const cal = shopCalendar();
  const ids = BARBERS.map((b) => [b.id, barberCalendarId(b)] as const).filter(([, c]) => c);
  if (cal && ids.length) {
    const fb = await freeBusy(cal, ids.map(([, c]) => c!), range);
    for (const [barberId, calId] of ids) out[barberId].push(...(fb[calId!] ?? []));
  }
  const { db, schema } = await import("./db");
  const { and, eq, gt, lt } = await import("drizzle-orm");
  const a = schema.appointments;
  const booked = await db
    .select({ barberId: a.barberId, start: a.start, end: a.end })
    .from(a)
    .where(and(eq(a.status, "BOOKED"), lt(a.start, new Date(range.end)), gt(a.end, new Date(range.start))));
  for (const a of booked) out[a.barberId]?.push({ start: a.start.getTime(), end: a.end.getTime() });
  void now;
  return out;
}

/** The customer's busy blocks from their Google Calendar (empty if not connected). */
export async function userBusy(viewer: Viewer | null, range: Interval, now: number): Promise<Interval[]> {
  if (!viewer) return [];
  if (viewer.isDemo) return demoUserBusy(range, now);
  if (!viewer.calendarConnected) return [];
  const { userCalendar, freeBusy } = await import("./google");
  const cal = await userCalendar(viewer.id);
  if (!cal) return [];
  try {
    const fb = await freeBusy(cal, ["primary"], range);
    return fb.primary ?? [];
  } catch (e) {
    console.error("[schedule] couldn't read the customer's calendar", e);
    return [];
  }
}

async function eventDates(viewer: Viewer | null, now: number): Promise<Record<string, string>> {
  if (!viewer) return {};
  if (viewer.isDemo) return { [demoWeddingDay(now).toISODate()!]: "Wedding" };
  const { db, schema } = await import("./db");
  const { and, eq, gte, ne } = await import("drizzle-orm");
  const e = schema.eventAlerts;
  const alerts = await db
    .select()
    .from(e)
    .where(and(eq(e.userId, viewer.id), gte(e.eventStart, new Date(now)), ne(e.status, "DISMISSED"), ne(e.kind, "repeat clash")));
  return Object.fromEntries(
    alerts.map((a) => [DateTime.fromJSDate(a.eventStart, { zone: SHOP.timeZone }).toISODate()!, a.kind]),
  );
}

export async function getSchedule(
  viewer: Viewer | null,
  opts: { serviceId?: string | null; now?: number } = {},
): Promise<Schedule> {
  const now = opts.now ?? Date.now();
  const service = getService(opts.serviceId) ?? getService(DEFAULT_SERVICE_ID)!;
  const range = windowRange(now);
  const [bBusy, uBusy, events] = await Promise.all([
    barberBusy(range, now),
    userBusy(viewer, range, now),
    eventDates(viewer, now),
  ]);

  const slotsByDate: Record<string, Slot[]> = {};
  const days = bookingDates(now).map((date) => {
    const slots = computeSlots({ date, durationMinutes: service.minutes, barberBusy: bBusy, userBusy: uBusy, now });
    slotsByDate[date] = slots;
    return describeDay(date, slots.length);
  });

  const first = DateTime.fromISO(days[0].date, { zone: SHOP.timeZone });
  const last = DateTime.fromISO(days[days.length - 1].date, { zone: SHOP.timeZone });
  return {
    days,
    slotsByDate,
    eventDates: events,
    rangeLabel: `${first.toFormat("LLL d")} – ${last.toFormat(first.month === last.month ? "d" : "LLL d")}`,
    shopLive: isDemo || Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
  };
}
