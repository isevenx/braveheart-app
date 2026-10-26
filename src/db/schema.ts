/**
 * Braveheart app database (PostgreSQL, via Drizzle ORM).
 * Barbers, services and shop hours live in src/lib/shop.ts, not here: a four-chair
 * shop changes them rarely, and keeping them in code keeps setup simple.
 * Apply changes with `npm run db:push`.
 */
import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// ---------- Auth.js tables ----------

export const users = pgTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),

  phone: text("phone"),
  smsReminders: boolean("smsReminders").notNull().default(true),
  calendarConnected: boolean("calendarConnected").notNull().default(false),
  /** Lets the AI scan event titles for big days. */
  shareEventTitles: boolean("shareEventTitles").notNull().default(true),
  addBookingsToCalendar: boolean("addBookingsToCalendar").notNull().default(true),
  emailAlerts: boolean("emailAlerts").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/**
 * Name + phone typed on the sign-up form, held until the email sign-in link is
 * clicked and the user row exists (keeps personal data out of URLs).
 */
export const pendingProfiles = pgTable("pendingProfile", {
  email: text("email").primaryKey(),
  name: text("name"),
  phone: text("phone"),
  smsReminders: boolean("smsReminders").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// ---------- Booking ----------

export const appointmentStatus = pgEnum("appointment_status", ["BOOKED", "CANCELLED"]);

export const recurringSeries = pgTable("recurringSeries", {
  id: id(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  barberId: text("barberId").notNull(),
  serviceId: text("serviceId").notNull(),
  /** "1w" | "2w" | "3w" | "1m" | "3m" */
  frequency: text("frequency").notNull(),
  /** First appointment; later ones keep its weekday and local time. */
  anchorStart: timestamp("anchorStart", { mode: "date", withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const appointments = pgTable(
  "appointment",
  {
    id: id(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    barberId: text("barberId").notNull(),
    serviceId: text("serviceId").notNull(),
    start: timestamp("start", { mode: "date", withTimezone: true }).notNull(),
    end: timestamp("end", { mode: "date", withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("BOOKED"),
    note: text("note"),
    /** Event id on the barber's Google Calendar. */
    shopEventId: text("shopEventId"),
    /** Event id on the customer's Google Calendar. */
    userEventId: text("userEventId"),
    seriesId: text("seriesId").references(() => recurringSeries.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("appointment_user_start").on(t.userId, t.start), index("appointment_barber_start").on(t.barberId, t.start)],
);

// ---------- Notifications ----------

export const pushSubscriptions = pgTable("pushSubscription", {
  id: id(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const alertStatus = pgEnum("alert_status", ["NEW", "NOTIFIED", "DISMISSED", "BOOKED"]);

export const eventAlerts = pgTable(
  "eventAlert",
  {
    id: id(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    calendarEventId: text("calendarEventId").notNull(),
    title: text("title").notNull(),
    /** "wedding" | "interview" | "prom" | ... | "repeat clash" */
    kind: text("kind").notNull(),
    reason: text("reason").notNull(),
    eventStart: timestamp("eventStart", { mode: "date", withTimezone: true }).notNull(),
    status: alertStatus("status").notNull().default("NEW"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("eventAlert_user_event").on(t.userId, t.calendarEventId), index("eventAlert_user_status").on(t.userId, t.status)],
);
