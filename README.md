# Braveheart Barbershop — booking app (PWA)

A mobile web app for **Braveheart Barbershop & Lifestyle Co.** (972 Garnet Ave, Pacific Beach) that books around the customer's life:

- **Slots that fit your week.** Customers connect Google Calendar; the app lays their busy times over each barber's calendar and only shows chair times they can actually make.
- **A heads-up before big days.** A daily job has AI (Claude) read upcoming event titles, spot weddings, interviews, proms, photoshoots and so on, and send a push notification + email suggesting a cut.
- **Recurring cuts.** Weekly, every 2 or 3 weeks, monthly or quarterly. A daily job books each repeat as it comes into range, and flags clashes instead of double-booking.
- **Installable PWA.** Add to Home Screen on iPhone/Android, offline-cached assets, web push.

Built with Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Auth.js (Google + email link) · Drizzle ORM + PostgreSQL · Google Calendar API · Anthropic API · Web Push · Resend · Vercel Cron.

---

## Try it in 2 minutes (demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000 (use your browser's phone view). With no settings, the app runs in **demo mode**: a sample customer ("Alex") with a sample calendar and a wedding coming up. Every screen works and nothing is saved.

```bash
npm test          # unit tests: slot engine, recurrence, big-day detection
npm run typecheck
npm run build
```

---

## Going live: what you need to set up

Work through these in order. Each step gives you values for `.env.local` (local) and **Vercel → Project → Settings → Environment Variables** (production). `.env.example` lists every variable. Demo mode switches off automatically once `DATABASE_URL` and `AUTH_GOOGLE_ID` are set.

### 1. Host on Vercel
1. Sign in at [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import `braveheart-app`.
2. Deploy once (it runs in demo mode). Note the URL, e.g. `braveheart-app.vercel.app`.
3. Later, add a custom domain such as `book.braveheartpb.com` under **Settings → Domains**.
4. Set `APP_URL` to the final URL.

### 2. Database (PostgreSQL)
1. In Vercel: **Storage → Create → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL`.
2. Create the tables: copy `DATABASE_URL` into `.env.local`, then run `npm run db:push`.

### 3. Google sign-in + customer calendars
In [Google Cloud Console](https://console.cloud.google.com):
1. Create a project, e.g. "Braveheart App".
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **OAuth consent screen**:
   - User type: External.
   - App name "Braveheart Barbershop", logo, support email.
   - Home page and privacy policy: `https://YOUR-DOMAIN/privacy`.
   - Scopes: `.../auth/calendar.freebusy` and `.../auth/calendar.events`.
   - While testing, add your own Google accounts as **Test users** (up to 100).
4. **Credentials → Create credentials → OAuth client ID → Web application**, with these authorized redirect URIs:
   - `https://YOUR-DOMAIN/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
5. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
6. Generate `AUTH_SECRET` with `npx auth secret`.

> ⚠️ **Google verification before public launch.** Calendar access counts as a *sensitive scope*. Until Google verifies the app, only your listed test users can sign in, and they see an "unverified app" warning. Submit for verification from the OAuth consent screen once the privacy policy is final. It usually takes a few days to a few weeks.

### 4. The shop's calendars (barber availability)
The app reads and writes each barber's **Google Calendar**, which is what blocks the chair.
1. Each barber has a Google Calendar. Their own account or calendars the shop owns both work.
2. In Google Cloud: **IAM & Admin → Service Accounts → Create**, then **Keys → Add key → JSON**.
   - Put the `client_email` value in `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - Put the `private_key` value in `GOOGLE_SERVICE_ACCOUNT_KEY`.
3. Share each barber's calendar with that service-account email, with permission **Make changes to events**.
4. Copy each calendar's ID (Google Calendar → Settings → *Integrate calendar*) into `CAL_JARED`, `CAL_CAMILO`, `CAL_BOOBI` and `CAL_JOHN`.

> **Running alongside Vagaro.** Vagaro offers a [two-way Google Calendar sync](https://www.vagaro.com/pro/updates/google-sync). If each barber syncs Vagaro with the same Google Calendar, bookings made in Vagaro block time in this app and vice versa. Confirm with the shop that their Vagaro plan includes it and that synced events block time, before taking real bookings.

### 5. Email (Resend)
Used for email sign-in links, booking confirmations and big-day emails.
1. Create an account at [resend.com](https://resend.com) and verify a sending domain, e.g. `braveheartpb.com`. This means adding DNS records wherever the domain is managed.
2. Set `AUTH_RESEND_KEY` and set `EMAIL_FROM`, e.g. `Braveheart <book@braveheartpb.com>`.

### 6. AI big-day detection (Anthropic)
Create an API key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`.
- The default model is `claude-haiku-5-5`, which is fast and cheap for this classification task.
- Without a key, the app falls back to simple keyword matching.

### 7. Push notifications
Run `npm run vapid`, then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Customers turn alerts on in **Profile**.
- **iPhone:** push only works after the customer adds the app to their Home Screen (iOS 16.4+). The Profile screen explains this to them.

### 8. Daily jobs
`vercel.json` schedules two jobs. Set `CRON_SECRET` to a long random string (`openssl rand -hex 32`); Vercel sends it automatically.
- **8:00 AM Pacific:** big-day scan (`/api/cron/scan-events`).
- **8:30 AM Pacific:** recurring bookings (`/api/cron/recurring`).

### 9. Redeploy and test
1. Redeploy in Vercel after adding the variables.
2. Sign up with a test-user Google account, connect your calendar, and book.
3. Check the event appears on the barber's calendar.

---

## To confirm with the shop

| Item | Where it lives |
|---|---|
| **Service durations**: the current ones are placeholders and decide which slots fit | `src/lib/shop.ts` → `minutes` |
| Hours (taken from braveheartpb.com), how far ahead people can book (21 days), minimum notice (60 min) | `src/lib/shop.ts` |
| Cancellation / late policy, final Terms and Privacy Policy | `src/app/terms`, `src/app/privacy` |
| Square headshots of each barber (current photos are small crops from Vagaro) | `public/images/barbers/` |
| Vagaro ↔ Google Calendar sync for each barber | step 4 above |

## Not built yet (good next steps)

- **SMS reminders.** The opt-in and phone number are stored, but sending needs Twilio.
- **"Jump to date" calendar.** The day strip scrolls 21 days; the calendar icon next to it is display-only for now.
- **Shop/barber admin view.** For now barbers manage their day in Google Calendar (or Vagaro, if synced).
- **Deposits / no-show protection, payments.**

## Project structure

```
src/
  app/                 screens (App Router) + server actions + API routes
    page.tsx           1 · Welcome
    signup/, signin/   2 · Create account / sign in
    connect-calendar/  3 · Connect Google Calendar
    home/              4 · Home (photo header, big-day card, slot picker, next cut)
    book/              5 · Service → time/ 6 · Barber & time → confirm/ 7 · Review & confirm
    appointments/      Calendar tab (upcoming + recurring)
    profile/           Profile tab (calendar, push alerts, preferences)
    api/cron/          daily jobs
  components/          SlotPicker (day strip + time grid), BottomNav, UI pieces
  db/schema.ts         database tables (Drizzle)
  lib/
    availability.ts    the slot engine: customer calendar ∩ barber calendars ∩ shop hours
    recurrence.ts      recurring schedule (DST-safe, "first Tuesday" monthly)
    big-events.ts      AI big-day detection + keyword fallback
    schedule.ts        loads busy times (Google or demo) and builds the 21-day view
    booking.ts         creates bookings on the barber's + customer's calendars
    jobs.ts            daily scan + recurring booking jobs
    shop.ts            hours, barbers, services, prices
public/sw.js           service worker (asset cache + push)
```
