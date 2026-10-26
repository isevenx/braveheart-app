"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { isDemo, hasEmailSignIn } from "@/lib/env";
import { getViewer, requireViewer } from "@/lib/viewer";
import { createBooking, cancelAppointment, type BookingRequest, type BookingResult } from "@/lib/booking";

// ---------- Sign up / sign in ----------

export async function googleSignIn(redirectTo: string) {
  if (isDemo) redirect("/connect-calendar");
  const { signIn } = await import("@/lib/auth");
  await signIn("google", { redirectTo });
}

const SignUp = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  smsReminders: z.string().optional(),
});

export type FormState = { error?: string; sent?: boolean } | undefined;

export async function emailSignUp(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please enter a valid email address." };
  if (isDemo) redirect("/connect-calendar");
  if (!hasEmailSignIn) return { error: "Email sign-up isn't set up yet. Use Continue with Google." };
  const { db, schema } = await import("@/lib/db");
  const { email, name, phone, smsReminders } = parsed.data;
  const profile = { name, phone, smsReminders: smsReminders === "on" };
  await db
    .insert(schema.pendingProfiles)
    .values({ email: email.toLowerCase(), ...profile })
    .onConflictDoUpdate({ target: schema.pendingProfiles.email, set: profile });
  const { signIn } = await import("@/lib/auth");
  await signIn("resend", { email, redirectTo: "/connect-calendar", redirect: false });
  return { sent: true };
}

export async function emailSignIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = z.string().trim().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Please enter a valid email address." };
  if (isDemo) redirect("/home");
  if (!hasEmailSignIn) return { error: "Email sign-in isn't set up yet. Use Continue with Google." };
  const { signIn } = await import("@/lib/auth");
  await signIn("resend", { email: email.data, redirectTo: "/home", redirect: false });
  return { sent: true };
}

export async function signOutAction() {
  if (isDemo) redirect("/");
  const { signOut } = await import("@/lib/auth");
  await signOut({ redirectTo: "/" });
}

// ---------- Google Calendar ----------

export async function connectCalendar(form: FormData) {
  const viewer = await requireViewer();
  const shareEventTitles = form.get("shareEventTitles") === "on";
  const addBookingsToCalendar = form.get("addBookingsToCalendar") === "on";
  if (viewer.isDemo) redirect("/home");

  const { db, schema } = await import("@/lib/db");
  await db.update(schema.users).set({ shareEventTitles, addBookingsToCalendar }).where(eq(schema.users.id, viewer.id));

  const { signIn, CALENDAR_SCOPES } = await import("@/lib/auth");
  const scopes = ["openid", "email", "profile", CALENDAR_SCOPES.freeBusy];
  if (shareEventTitles || addBookingsToCalendar) scopes.push(CALENDAR_SCOPES.events);
  await signIn(
    "google",
    { redirectTo: "/home" },
    { scope: scopes.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  );
}

export async function disconnectCalendar() {
  const viewer = await requireViewer();
  if (viewer.isDemo) return;
  const { db, schema } = await import("@/lib/db");
  await db.update(schema.users).set({ calendarConnected: false }).where(eq(schema.users.id, viewer.id));
  revalidatePath("/profile");
}

// ---------- Booking ----------

export async function bookAppointment(req: BookingRequest): Promise<BookingResult> {
  const viewer = await getViewer();
  const res = await createBooking(viewer, req);
  if (res.ok) {
    revalidatePath("/home");
    revalidatePath("/appointments");
  }
  return res;
}

export async function cancelAppointmentAction(form: FormData) {
  const viewer = await requireViewer();
  await cancelAppointment(viewer, String(form.get("id")));
  revalidatePath("/appointments");
  revalidatePath("/home");
}

export async function stopSeries(form: FormData) {
  const viewer = await requireViewer();
  if (viewer.isDemo) return;
  const { db, schema } = await import("@/lib/db");
  const s = schema.recurringSeries;
  await db.update(s).set({ active: false }).where(and(eq(s.id, String(form.get("id"))), eq(s.userId, viewer.id)));
  revalidatePath("/appointments");
}

// ---------- Alerts & notifications ----------

export async function dismissAlert(id: string) {
  const viewer = await requireViewer();
  if (viewer.isDemo) return;
  const { db, schema } = await import("@/lib/db");
  const e = schema.eventAlerts;
  await db.update(e).set({ status: "DISMISSED" }).where(and(eq(e.id, id), eq(e.userId, viewer.id)));
  revalidatePath("/home");
}

const PushSub = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });

export async function savePushSubscription(sub: unknown) {
  const viewer = await requireViewer();
  const parsed = PushSub.safeParse(sub);
  if (viewer.isDemo) return { ok: true };
  if (!parsed.success) return { ok: false };
  const { db, schema } = await import("@/lib/db");
  const { endpoint, keys } = parsed.data;
  const row = { userId: viewer.id, p256dh: keys.p256dh, auth: keys.auth };
  await db
    .insert(schema.pushSubscriptions)
    .values({ endpoint, ...row })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: row });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const viewer = await requireViewer();
  if (viewer.isDemo) return;
  const { db, schema } = await import("@/lib/db");
  const p = schema.pushSubscriptions;
  await db.delete(p).where(and(eq(p.endpoint, endpoint), eq(p.userId, viewer.id)));
}

export async function updatePreferences(form: FormData) {
  const viewer = await requireViewer();
  if (viewer.isDemo) return;
  const { db, schema } = await import("@/lib/db");
  await db
    .update(schema.users)
    .set({
      shareEventTitles: form.get("shareEventTitles") === "on",
      addBookingsToCalendar: form.get("addBookingsToCalendar") === "on",
      emailAlerts: form.get("emailAlerts") === "on",
      smsReminders: form.get("smsReminders") === "on",
    })
    .where(eq(schema.users.id, viewer.id));
  revalidatePath("/profile");
}
