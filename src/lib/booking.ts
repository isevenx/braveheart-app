import "server-only";
import { DateTime } from "luxon";
import { computeSlots, slotInterval, windowRange } from "./availability";
import { isDemo } from "./env";
import { frequencyLabel, isFrequency, type FrequencyId } from "./recurrence";
import { barberBusy, userBusy } from "./schedule";
import { BARBERS, SHOP, barberCalendarId, getBarber, getService } from "./shop";
import type { Viewer } from "./viewer";

export type BookingRequest = {
  serviceId: string;
  barberId: string; // a barber id, or "any"
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  repeat?: string | null; // FrequencyId
  note?: string | null;
  addToCalendar?: boolean;
  textReminder?: boolean;
  guest?: { name: string; email: string; phone?: string };
};

export type BookingResult =
  | { ok: true; appointmentId: string; barberName: string; whenLabel: string; serviceName: string; repeatLabel: string | null; addedToCalendar: boolean }
  | { ok: false; error: string };

export async function createBooking(viewer: Viewer | null, req: BookingRequest): Promise<BookingResult> {
  const service = getService(req.serviceId);
  if (!service) return { ok: false, error: "Pick a service first." };
  const interval = slotInterval(req.date, req.time, service.minutes);
  if (!interval) return { ok: false, error: "That time isn't valid." };
  const repeat: FrequencyId | null = isFrequency(req.repeat) ? req.repeat : null;
  if (!viewer && !req.guest) return { ok: false, error: "Sign in or enter your details to book." };
  if (!viewer && repeat) return { ok: false, error: "Create an account to set up recurring cuts." };

  // Re-check availability right before booking: someone may have taken the chair.
  const now = Date.now();
  const range = windowRange(now, 60);
  const [bBusy, uBusy] = await Promise.all([barberBusy(range, now), userBusy(viewer, range, now)]);
  const candidates = req.barberId === "any" ? BARBERS.map((b) => b.id) : [req.barberId];
  const slot = computeSlots({
    date: req.date,
    durationMinutes: service.minutes,
    barberBusy: Object.fromEntries(candidates.map((id) => [id, bBusy[id] ?? []])),
    userBusy: uBusy,
    now,
  }).find((s) => s.time === req.time);
  if (!slot) return { ok: false, error: "That time was just taken or no longer fits your calendar. Please pick another." };

  const barber = getBarber(slot.barberIds[0])!;
  const start = DateTime.fromMillis(interval.start, { zone: SHOP.timeZone });
  const whenLabel = `${start.toFormat("ccc, LLL d")} · ${start.toFormat("h:mm a")}`;
  const repeatLabel = repeat ? frequencyLabel(repeat) : null;

  if (isDemo) {
    return { ok: true, appointmentId: "demo", barberName: barber.name, whenLabel, serviceName: service.name, repeatLabel, addedToCalendar: Boolean(req.addToCalendar) };
  }

  const { db, schema } = await import("./db");
  const { eq } = await import("drizzle-orm");
  const { shopCalendar, userCalendar, insertEvent } = await import("./google");

  // Guests get a lightweight user row (no sign-in) so the booking has an owner.
  let userId = viewer?.id;
  let customerName = viewer?.name ?? req.guest!.name;
  let customerEmail = viewer?.email ?? req.guest!.email;
  if (!userId) {
    const g = req.guest!;
    const [u] = await db
      .insert(schema.users)
      .values({ email: g.email.toLowerCase(), name: g.name, phone: g.phone || null })
      .onConflictDoUpdate({ target: schema.users.email, set: { phone: g.phone || undefined } })
      .returning();
    userId = u.id;
    customerName = u.name ?? g.name;
    customerEmail = u.email ?? g.email;
  } else if (req.textReminder !== undefined) {
    await db.update(schema.users).set({ smsReminders: req.textReminder }).where(eq(schema.users.id, userId));
  }

  const series = repeat
    ? (
        await db
          .insert(schema.recurringSeries)
          .values({ userId, barberId: barber.id, serviceId: service.id, frequency: repeat, anchorStart: new Date(interval.start) })
          .returning()
      )[0]
    : null;

  // 1) The barber's calendar — this is what blocks the chair for everyone else.
  let shopEventId: string | null = null;
  const shopCal = shopCalendar();
  const barberCal = barberCalendarId(barber);
  if (shopCal && barberCal) {
    shopEventId = await insertEvent(shopCal, barberCal, {
      summary: `${customerName} · ${service.name}`,
      description: [`Booked in the Braveheart app.`, req.note ? `Note: ${req.note}` : "", repeatLabel ? `Repeats: ${repeatLabel}` : ""].filter(Boolean).join("\n"),
      start: new Date(interval.start),
      end: new Date(interval.end),
      timeZone: SHOP.timeZone,
    }).catch((e) => {
      console.error("[booking] failed to write barber calendar", e);
      return null;
    });
  }

  // 2) The customer's calendar, if they asked for it.
  let userEventId: string | null = null;
  if (viewer && req.addToCalendar && viewer.calendarConnected) {
    const cal = await userCalendar(viewer.id);
    if (cal) {
      userEventId = await insertEvent(cal, "primary", {
        summary: `${service.name} with ${barber.name} · Braveheart`,
        location: `${SHOP.name}, ${SHOP.address}`,
        start: new Date(interval.start),
        end: new Date(interval.end),
        timeZone: SHOP.timeZone,
      }).catch(() => null);
    }
  }

  const [appt] = await db
    .insert(schema.appointments)
    .values({
      userId,
      barberId: barber.id,
      serviceId: service.id,
      start: new Date(interval.start),
      end: new Date(interval.end),
      note: req.note || null,
      shopEventId,
      userEventId,
      seriesId: series?.id,
    })
    .returning();

  if (customerEmail) {
    const { sendEmail, emailHtml } = await import("./notify");
    await sendEmail(
      customerEmail,
      `You're booked: ${whenLabel}`,
      emailHtml("you're booked.", `${service.name} with ${barber.name}, ${whenLabel}.${repeatLabel ? ` Repeats ${repeatLabel.toLowerCase()}.` : ""}`, { label: "See your appointments", path: "/appointments" }),
    ).catch(() => undefined);
  }

  return { ok: true, appointmentId: appt.id, barberName: barber.name, whenLabel, serviceName: service.name, repeatLabel, addedToCalendar: Boolean(userEventId) };
}

export async function cancelAppointment(viewer: Viewer, appointmentId: string): Promise<boolean> {
  if (viewer.isDemo) return true;
  const { db, schema } = await import("./db");
  const { and, eq } = await import("drizzle-orm");
  const A = schema.appointments;
  const appt = await db.query.appointments.findFirst({
    where: and(eq(A.id, appointmentId), eq(A.userId, viewer.id), eq(A.status, "BOOKED")),
  });
  if (!appt) return false;
  const { shopCalendar, userCalendar, deleteEvent } = await import("./google");
  const barber = getBarber(appt.barberId);
  const shopCal = shopCalendar();
  const calId = barber && barberCalendarId(barber);
  if (shopCal && calId && appt.shopEventId) await deleteEvent(shopCal, calId, appt.shopEventId);
  if (appt.userEventId) {
    const cal = await userCalendar(viewer.id);
    if (cal) await deleteEvent(cal, "primary", appt.userEventId);
  }
  await db.update(A).set({ status: "CANCELLED" }).where(eq(A.id, appt.id));
  return true;
}
