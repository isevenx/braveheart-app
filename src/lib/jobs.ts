import "server-only";
import { DateTime } from "luxon";
import { and, eq } from "drizzle-orm";
import { computeSlots, isFree, windowRange } from "./availability";
import { detectBigEvents } from "./big-events";
import { db, schema } from "./db";
import { listEvents, userCalendar, shopCalendar, insertEvent } from "./google";
import { emailHtml, sendEmail, sendPush } from "./notify";
import { isFrequency, occurrencesBetween } from "./recurrence";
import { barberBusy, userBusy } from "./schedule";
import { SHOP, barberCalendarId, getBarber, getService } from "./shop";
import type { Viewer } from "./viewer";

const DAY = 86_400_000;
const { users, eventAlerts, recurringSeries, appointments } = schema;

/**
 * Daily: read each opted-in customer's next 30 days, let the AI flag big days,
 * and send one push + email per new big day ("Wedding Sat: book a cut?").
 */
export async function scanBigEvents(now = Date.now()) {
  const people = await db
    .select()
    .from(users)
    .where(and(eq(users.calendarConnected, true), eq(users.shareEventTitles, true)));
  let alerts = 0;
  for (const u of people) {
    try {
      const cal = await userCalendar(u.id);
      if (!cal) continue;
      // Look 2–30 days out: enough lead time to actually get a chair.
      const events = await listEvents(cal, { start: now + 2 * DAY, end: now + 30 * DAY });
      const seen = await db
        .select({ id: eventAlerts.calendarEventId })
        .from(eventAlerts)
        .where(eq(eventAlerts.userId, u.id));
      const known = new Set(seen.map((s) => s.id));
      const fresh = events.filter((e) => !known.has(e.id));
      if (fresh.length === 0) continue;

      const big = await detectBigEvents(fresh);
      for (const b of big) {
        const when = DateTime.fromISO(b.start, { zone: SHOP.timeZone });
        await db
          .insert(eventAlerts)
          .values({ userId: u.id, calendarEventId: b.id, title: b.title, kind: b.kind, reason: b.reason, eventStart: when.toJSDate(), status: "NOTIFIED" })
          .onConflictDoNothing();
        const heading = `${capitalize(b.kind)} · ${when.toFormat("ccc, LLL d")}`;
        const body = "Fresh cut before the big day? We found times that fit your schedule.";
        await sendPush(u.id, { title: heading, body, url: "/home", tag: `alert-${b.id}` });
        if (u.emailAlerts && u.email) {
          await sendEmail(u.email, `${heading}: book a fresh cut?`, emailHtml(heading, body, { label: "Find a time", path: "/home" }));
        }
        alerts++;
      }
    } catch (e) {
      console.error("[scan] user failed", u.id, e);
    }
  }
  return { users: people.length, alerts };
}

/**
 * Daily: for each recurring series, book the next repeat once it enters the
 * booking window, if the barber is free and it doesn't clash with the
 * customer's calendar. Clashes are flagged to the customer instead of booked.
 */
export async function bookRecurring(now = Date.now()) {
  const rows = await db
    .select({ s: recurringSeries, u: users })
    .from(recurringSeries)
    .innerJoin(users, eq(users.id, recurringSeries.userId))
    .where(eq(recurringSeries.active, true));
  const window = windowRange(now, SHOP.bookingWindowDays);
  const bBusy = await barberBusy(window, now);
  let booked = 0;
  let clashes = 0;

  for (const { s, u } of rows) {
    if (!isFrequency(s.frequency)) continue;
    const service = getService(s.serviceId);
    const barber = getBarber(s.barberId);
    if (!service || !barber) continue;
    const anchorISO = DateTime.fromJSDate(s.anchorStart, { zone: SHOP.timeZone }).toISO()!;
    const upcoming = occurrencesBetween(anchorISO, s.frequency, now, window.end);
    if (upcoming.length === 0) continue;

    const existing = await db.select({ start: appointments.start }).from(appointments).where(eq(appointments.seriesId, s.id));
    const have = new Set(existing.map((a) => a.start.getTime()));
    const viewer = { id: u.id, calendarConnected: u.calendarConnected, isDemo: false } as Viewer;
    const uBusy = await userBusy(viewer, window, now);

    for (const occ of upcoming) {
      if (have.has(occ.toMillis())) continue;
      const slot = { start: occ.toMillis(), end: occ.toMillis() + service.minutes * 60_000 };
      const fitsShop = computeSlots({
        date: occ.toISODate()!,
        durationMinutes: service.minutes,
        barberBusy: { [barber.id]: bBusy[barber.id] ?? [] },
        userBusy: [],
        now,
      }).some((x) => x.time === occ.toFormat("HH:mm"));
      const label = `${occ.toFormat("ccc, LLL d")} at ${occ.toFormat("h:mm a")}`;

      if (!fitsShop || !isFree(slot, uBusy)) {
        clashes++;
        // Record the skipped date once so the customer is only told once.
        const inserted = await db
          .insert(eventAlerts)
          .values({
            userId: u.id,
            calendarEventId: `series-${s.id}-${occ.toMillis()}`,
            title: `Repeat cut ${label}`,
            kind: "repeat clash",
            reason: fitsShop ? "Clashes with your calendar." : "Your barber is booked.",
            eventStart: occ.toJSDate(),
            status: "NOTIFIED",
          })
          .onConflictDoNothing()
          .returning({ id: eventAlerts.id });
        if (inserted.length) {
          const body = fitsShop
            ? `Your repeat cut on ${label} clashes with your calendar. Tap to pick another time.`
            : `${barber.name} is booked on ${label}. Tap to pick another time.`;
          await sendPush(u.id, { title: "Your next cut needs a new time", body, url: "/home" });
          if (u.emailAlerts && u.email) {
            await sendEmail(u.email, "Your next cut needs a new time", emailHtml("Pick a new time", body, { label: "Find a time", path: "/home" }));
          }
        }
        continue;
      }

      const shopCal = shopCalendar();
      const calId = barberCalendarId(barber);
      const shopEventId =
        shopCal && calId
          ? await insertEvent(shopCal, calId, {
              summary: `${u.name ?? "Customer"} · ${service.name}`,
              description: "Recurring booking (Braveheart app).",
              start: new Date(slot.start),
              end: new Date(slot.end),
              timeZone: SHOP.timeZone,
            }).catch(() => null)
          : null;
      await db.insert(appointments).values({
        userId: u.id,
        barberId: barber.id,
        serviceId: service.id,
        start: new Date(slot.start),
        end: new Date(slot.end),
        seriesId: s.id,
        shopEventId,
      });
      bBusy[barber.id] = [...(bBusy[barber.id] ?? []), slot];
      booked++;
      await sendPush(u.id, { title: "Your next cut is booked", body: `${service.name} with ${barber.name}, ${label}.`, url: "/appointments" });
    }
  }
  return { series: rows.length, booked, clashes };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
