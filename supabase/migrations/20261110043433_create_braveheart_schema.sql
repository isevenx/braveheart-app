/*
# Create Braveheart app schema

1. New Tables
- `user`: customer accounts (name, email, phone, notification and calendar preferences).
- `account`, `session`, `verificationToken`: sign-in bookkeeping for the app's email sign-in.
- `pendingProfile`: name and phone held until the email sign-in link is clicked.
- `recurringSeries`: repeating appointment schedules (weekly, every 2 or 3 weeks, monthly).
- `appointment`: booked and cancelled appointments.
- `pushSubscription`: browser push notification subscriptions.
- `eventAlert`: calendar events flagged as big days that may clash with bookings.
- Enum types `appointment_status` and `alert_status`.

2. Security
- Row level security is enabled on every table.
- All access from the public (anon) and signed-in (authenticated) Data API roles is revoked.
- No policies are added, so the browser cannot read or write these tables directly.
- The app's server code connects with the database owner role, which bypasses row level security.

3. Notes
- Ids are text values; the app generates them with random UUIDs.
- Statements are idempotent so the migration can be safely re-applied.
*/

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('BOOKED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('NEW', 'NOTIFIED', 'DISMISSED', 'BOOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text,
  email text UNIQUE,
  "emailVerified" timestamp,
  image text,
  phone text,
  "smsReminders" boolean NOT NULL DEFAULT true,
  "calendarConnected" boolean NOT NULL DEFAULT false,
  "shareEventTitles" boolean NOT NULL DEFAULT true,
  "addBookingsToCalendar" boolean NOT NULL DEFAULT true,
  "emailAlerts" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account (
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  PRIMARY KEY (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS session (
  "sessionToken" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamp NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS "pendingProfile" (
  email text PRIMARY KEY,
  name text,
  phone text,
  "smsReminders" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "recurringSeries" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "barberId" text NOT NULL,
  "serviceId" text NOT NULL,
  frequency text NOT NULL,
  "anchorStart" timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "barberId" text NOT NULL,
  "serviceId" text NOT NULL,
  start timestamptz NOT NULL,
  "end" timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'BOOKED',
  note text,
  "shopEventId" text,
  "userEventId" text,
  "seriesId" text REFERENCES "recurringSeries"(id) ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_user_start ON appointment ("userId", start);
CREATE INDEX IF NOT EXISTS appointment_barber_start ON appointment ("barberId", start);

CREATE TABLE IF NOT EXISTS "pushSubscription" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "eventAlert" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "calendarEventId" text NOT NULL,
  title text NOT NULL,
  kind text NOT NULL,
  reason text NOT NULL,
  "eventStart" timestamptz NOT NULL,
  status alert_status NOT NULL DEFAULT 'NEW',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "eventAlert_user_event" ON "eventAlert" ("userId", "calendarEventId");
CREATE INDEX IF NOT EXISTS "eventAlert_user_status" ON "eventAlert" ("userId", status);

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pendingProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurringSeries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eventAlert" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "user", account, session, "verificationToken", "pendingProfile", "recurringSeries", appointment, "pushSubscription", "eventAlert" FROM anon, authenticated;
