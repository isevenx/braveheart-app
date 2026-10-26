import "server-only";
import { DateTime } from "luxon";
import { frequencyLabel, isFrequency } from "./recurrence";
import { HOURS, SHOP, getBarber, getService } from "./shop";
import type { Viewer } from "./viewer";

export type UpcomingAppointment = {
  id: string;
  month: string; // "NOV"
  day: number;
  whenLabel: string; // "Tue · 6:00 PM"
  fullLabel: string; // "Tue, Nov 3 · 6:00 PM"
  barberName: string;
  serviceName: string;
  price: number;
  repeatLabel: string | null;
  seriesId: string | null;
};

function shape(a: { id: string; start: Date; barberId: string; serviceId: string; seriesId: string | null }, freq?: string | null): UpcomingAppointment {
  const d = DateTime.fromJSDate(a.start, { zone: SHOP.timeZone });
  const service = getService(a.serviceId);
  return {
    id: a.id,
    month: d.toFormat("LLL").toUpperCase(),
    day: d.day,
    whenLabel: `${d.toFormat("ccc")} · ${d.toFormat("h:mm a")}`,
    fullLabel: `${d.toFormat("ccc, LLL d")} · ${d.toFormat("h:mm a")}`,
    barberName: getBarber(a.barberId)?.name ?? "Your barber",
    serviceName: service?.name ?? "Appointment",
    price: service?.price ?? 0,
    repeatLabel: freq && isFrequency(freq) ? frequencyLabel(freq) : null,
    seriesId: a.seriesId,
  };
}

export async function upcomingAppointments(viewer: Viewer, now = Date.now()): Promise<UpcomingAppointment[]> {
  if (viewer.isDemo) {
    const d = DateTime.fromMillis(now, { zone: SHOP.timeZone }).plus({ days: 8 }).set({ hour: 18, minute: 0 });
    const start = d.weekday === 7 ? d.plus({ days: 1 }) : d;
    return [shape({ id: "demo-1", start: start.toJSDate(), barberId: "jared", serviceId: "cut-beard", seriesId: "demo-series" }, "3w")];
  }
  const { db, schema } = await import("./db");
  const { and, asc, eq, gte } = await import("drizzle-orm");
  const A = schema.appointments;
  const S = schema.recurringSeries;
  const rows = await db
    .select({ a: A, freq: S.frequency })
    .from(A)
    .leftJoin(S, eq(S.id, A.seriesId))
    .where(and(eq(A.userId, viewer.id), eq(A.status, "BOOKED"), gte(A.start, new Date(now))))
    .orderBy(asc(A.start))
    .limit(20);
  return rows.map((r) => shape(r.a, r.freq));
}

/** Their most-booked service, tagged "Your usual" on the service list. */
export async function usualServiceId(viewer: Viewer | null): Promise<string | null> {
  if (!viewer) return null;
  if (viewer.isDemo) return "cut-beard";
  const { db, schema } = await import("./db");
  const { count, desc, eq } = await import("drizzle-orm");
  const A = schema.appointments;
  const [top] = await db
    .select({ serviceId: A.serviceId, n: count() })
    .from(A)
    .where(eq(A.userId, viewer.id))
    .groupBy(A.serviceId)
    .orderBy(desc(count()))
    .limit(1);
  return top?.serviceId ?? null;
}

export type SeriesSummary = { id: string; label: string; barberName: string; serviceName: string };

export async function activeSeries(viewer: Viewer): Promise<SeriesSummary[]> {
  if (viewer.isDemo) return [{ id: "demo-series", label: "Every 3 wks", barberName: "Jared", serviceName: "Haircut w/ Beard Trim" }];
  const { db, schema } = await import("./db");
  const { and, eq } = await import("drizzle-orm");
  const S = schema.recurringSeries;
  const rows = await db.select().from(S).where(and(eq(S.userId, viewer.id), eq(S.active, true)));
  return rows.map((s) => ({
    id: s.id,
    label: isFrequency(s.frequency) ? frequencyLabel(s.frequency) : s.frequency,
    barberName: getBarber(s.barberId)?.name ?? "",
    serviceName: getService(s.serviceId)?.name ?? "",
  }));
}

/** "OPEN TODAY UNTIL 7 PM" / "CLOSED TODAY · OPENS MON 10 AM" */
export function shopStatus(now = Date.now()): { open: boolean; text: string } {
  const t = DateTime.fromMillis(now, { zone: SHOP.timeZone });
  const fmt = (h: string) => DateTime.fromFormat(h, "HH:mm").toFormat(h.endsWith(":00") ? "h a" : "h:mm a");
  const today = HOURS[t.weekday];
  if (today) {
    const open = DateTime.fromFormat(today.open, "HH:mm", { zone: SHOP.timeZone }).set({ year: t.year, month: t.month, day: t.day });
    const close = open.set({ hour: +today.close.slice(0, 2), minute: +today.close.slice(3) });
    if (t < open) return { open: false, text: `Opens today at ${fmt(today.open)}` };
    if (t < close) return { open: true, text: `Open today until ${fmt(today.close)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = t.plus({ days: i });
    const h = HOURS[d.weekday];
    if (h) return { open: false, text: `Closed now · opens ${i === 1 ? "tomorrow" : d.toFormat("ccc")} ${fmt(h.open)}` };
  }
  return { open: false, text: "Closed" };
}

export function greeting(now = Date.now()): string {
  const h = DateTime.fromMillis(now, { zone: SHOP.timeZone }).hour;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
