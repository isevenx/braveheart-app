import "server-only";
import { redirect } from "next/navigation";
import { isDemo } from "./env";

export type Viewer = {
  id: string;
  name: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  image: string | null;
  calendarConnected: boolean;
  shareEventTitles: boolean;
  addBookingsToCalendar: boolean;
  emailAlerts: boolean;
  smsReminders: boolean;
  isDemo: boolean;
};

export const DEMO_VIEWER: Viewer = {
  id: "demo-user",
  name: "Alex Rivera",
  firstName: "Alex",
  email: "alex@example.com",
  phone: null,
  image: null,
  calendarConnected: true,
  shareEventTitles: true,
  addBookingsToCalendar: true,
  emailAlerts: true,
  smsReminders: true,
  isDemo: true,
};

/** The signed-in customer, or null. In demo mode, always the sample customer. */
export async function getViewer(): Promise<Viewer | null> {
  if (isDemo) return DEMO_VIEWER;
  const { auth } = await import("./auth");
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const { db, schema } = await import("./db");
  const { eq } = await import("drizzle-orm");
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!u) return null;
  const name = u.name || u.email?.split("@")[0] || "there";
  return {
    id: u.id,
    name,
    firstName: name.split(" ")[0],
    email: u.email,
    phone: u.phone,
    image: u.image,
    calendarConnected: u.calendarConnected,
    shareEventTitles: u.shareEventTitles,
    addBookingsToCalendar: u.addBookingsToCalendar,
    emailAlerts: u.emailAlerts,
    smsReminders: u.smsReminders,
    isDemo: false,
  };
}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/");
  return v;
}
