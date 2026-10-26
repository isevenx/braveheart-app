import "server-only";
import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { JWT, OAuth2Client } from "google-auth-library";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Interval } from "./availability";
import type { CalendarEventLite } from "./big-events";

/** Calendar client acting as the customer (their own Google Calendar). */
export async function userCalendar(userId: string): Promise<calendar_v3.Calendar | null> {
  const acct = await db.query.accounts.findFirst({
    where: and(eq(schema.accounts.userId, userId), eq(schema.accounts.provider, "google")),
  });
  if (!acct?.refresh_token && !acct?.access_token) return null;
  const client = new OAuth2Client({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  });
  client.setCredentials({
    access_token: acct.access_token ?? undefined,
    refresh_token: acct.refresh_token ?? undefined,
    expiry_date: acct.expires_at ? acct.expires_at * 1000 : undefined,
  });
  // Persist refreshed tokens so the next request doesn't refresh again.
  client.on("tokens", (t) => {
    db.update(schema.accounts)
      .set({
        access_token: t.access_token ?? undefined,
        expires_at: t.expiry_date ? Math.floor(t.expiry_date / 1000) : undefined,
        ...(t.refresh_token ? { refresh_token: t.refresh_token } : {}),
      })
      .where(and(eq(schema.accounts.provider, "google"), eq(schema.accounts.providerAccountId, acct.providerAccountId)))
      .catch((e: unknown) => console.error("[google] failed to save refreshed token", e));
  });
  return calendar({ version: "v3", auth: client });
}

/** Calendar client acting as the shop's service account (barber calendars are shared with it). */
export function shopCalendar(): calendar_v3.Calendar | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;
  const jwt = new JWT({ email, key, scopes: ["https://www.googleapis.com/auth/calendar"] });
  return calendar({ version: "v3", auth: jwt });
}

/** Busy blocks for several calendars over one range, in a single API call. */
export async function freeBusy(
  cal: calendar_v3.Calendar,
  calendarIds: string[],
  range: Interval,
): Promise<Record<string, Interval[]>> {
  if (calendarIds.length === 0) return {};
  const res = await cal.freebusy.query({
    requestBody: {
      timeMin: new Date(range.start).toISOString(),
      timeMax: new Date(range.end).toISOString(),
      items: calendarIds.map((id) => ({ id })),
    },
  });
  const out: Record<string, Interval[]> = {};
  for (const id of calendarIds) {
    const busy = res.data.calendars?.[id]?.busy ?? [];
    out[id] = busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: Date.parse(b.start!), end: Date.parse(b.end!) }));
  }
  return out;
}

/** Upcoming events with titles, for the big-day scan. */
export async function listEvents(cal: calendar_v3.Calendar, range: Interval): Promise<CalendarEventLite[]> {
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: new Date(range.start).toISOString(),
    timeMax: new Date(range.end).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });
  return (res.data.items ?? [])
    .filter((e) => e.id && e.summary && e.status !== "cancelled")
    .map((e) => ({
      id: e.id!,
      title: e.summary!,
      start: e.start?.dateTime ?? e.start?.date ?? "",
      description: e.description ?? undefined,
    }));
}

export async function insertEvent(
  cal: calendar_v3.Calendar,
  calendarId: string,
  ev: { summary: string; description?: string; start: Date; end: Date; location?: string; timeZone: string },
): Promise<string | null> {
  const res = await cal.events.insert({
    calendarId,
    requestBody: {
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      start: { dateTime: ev.start.toISOString(), timeZone: ev.timeZone },
      end: { dateTime: ev.end.toISOString(), timeZone: ev.timeZone },
    },
  });
  return res.data.id ?? null;
}

export async function deleteEvent(cal: calendar_v3.Calendar, calendarId: string, eventId: string) {
  await cal.events.delete({ calendarId, eventId }).catch(() => undefined);
}
