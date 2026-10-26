import Link from "next/link";
import { disconnectCalendar, signOutAction, updatePreferences } from "@/app/actions";
import { BottomNav } from "@/components/BottomNav";
import { CalendarCheckIcon } from "@/components/Icons";
import { Accent, btnPrimary } from "@/components/ui";
import { SHOP } from "@/lib/shop";
import { requireViewer } from "@/lib/viewer";
import { PushToggle } from "./PushToggle";

// Personalised + time-dependent: render on every request.
export const dynamic = "force-dynamic";

export default async function Profile() {
  const viewer = await requireViewer();
  const toggle = (name: string, title: string, sub: string, on: boolean) => (
    <label className="flex min-h-[54px] items-center gap-3 border-b border-line-soft">
      <span className="flex flex-1 flex-col gap-0.5">
        <strong className="text-[14px] font-semibold">{title}</strong>
        <span className="text-[12px] text-muted">{sub}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={on} className="m-0 h-5 w-5 accent-forest" />
    </label>
  );

  return (
    <>
      <main className="flex flex-1 flex-col px-6 pt-8 pb-8">
        <h1 className="font-serif text-[32px] leading-[1.1] font-bold">
          Hi, <Accent>{viewer.firstName}.</Accent>
        </h1>
        <p className="mt-1 text-[13px] text-muted">{viewer.email}</p>
        {viewer.isDemo && (
          <p className="mt-3 rounded-[4px] bg-white p-3 text-[12px] text-muted">
            Demo mode: sample data, nothing is saved. Add the settings in the README to go live.
          </p>
        )}

        <section aria-label="Google Calendar" className="mt-7 flex flex-col">
          <h2 className="eyebrow">Google Calendar</h2>
          <div className="mt-2 flex items-center gap-3 rounded-[4px] bg-white p-4">
            <CalendarCheckIcon size={20} className="text-forest" />
            <span className="flex-1 text-[14px] font-semibold">{viewer.calendarConnected ? "Connected" : "Not connected"}</span>
            {viewer.calendarConnected ? (
              <form action={disconnectCalendar}>
                <button type="submit" className="h-9 px-1 text-[13px] font-semibold">
                  Disconnect
                </button>
              </form>
            ) : (
              <Link href="/connect-calendar" className="text-[13px] font-semibold text-forest">
                Connect
              </Link>
            )}
          </div>
        </section>

        <section aria-label="Alerts" className="mt-7 flex flex-col">
          <h2 className="eyebrow">Alerts</h2>
          <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        </section>

        <form action={updatePreferences} className="mt-4 flex flex-col">
          <h2 className="eyebrow">Preferences</h2>
          {toggle("shareEventTitles", "Spot my big days", "Let the AI read event titles to suggest a cut", viewer.shareEventTitles)}
          {toggle("addBookingsToCalendar", "Add bookings to my calendar", "New appointments land on your Google Calendar", viewer.addBookingsToCalendar)}
          {toggle("emailAlerts", "Email alerts", "Big-day suggestions and booking updates", viewer.emailAlerts)}
          {toggle("smsReminders", "Text reminders", "Needs a mobile number on file", viewer.smsReminders)}
          <button type="submit" className={`${btnPrimary} mt-5 h-12 text-[16px]`}>
            Save preferences
          </button>
        </form>

        <form action={signOutAction} className="mt-6">
          <button type="submit" className="h-11 w-full text-[14px] font-semibold">
            Sign out
          </button>
        </form>
        <p className="mt-6 text-center text-[12px] text-muted">
          {SHOP.name}
          <br />
          {SHOP.address} · {SHOP.phone}
        </p>
      </main>
      <BottomNav active="/profile" />
    </>
  );
}
