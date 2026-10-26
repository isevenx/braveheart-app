import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ChevronRightIcon, RepeatIcon } from "@/components/Icons";
import { greeting, shopStatus, upcomingAppointments } from "@/lib/appointments";
import { getHomeAlert } from "@/lib/alerts";
import { getSchedule } from "@/lib/schedule";
import { requireViewer, type Viewer } from "@/lib/viewer";
import { HomeBooking } from "./HomeBooking";
import Image from "next/image";

// Personalised + time-dependent: render on every request.
export const dynamic = "force-dynamic";

async function load(viewer: Viewer) {
  const now = Date.now();
  const [schedule, alert, upcoming] = await Promise.all([
    getSchedule(viewer, { now }),
    getHomeAlert(viewer, now),
    upcomingAppointments(viewer, now),
  ]);
  return { now, schedule, alert, next: upcoming[0], status: shopStatus(now), hello: greeting(now) };
}

export default async function Home() {
  const viewer = await requireViewer();
  const { schedule, alert, next, status, hello } = await load(viewer);

  return (
    <>
      <main className="flex flex-1 flex-col">
        <header className="relative flex h-80 flex-none flex-col px-6 pb-[22px] text-white">
          <Image src="/images/shop-hero.webp" alt="" fill priority sizes="430px" className="object-cover object-[center_45%]" />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(55,59,77,.55) 0%, rgba(55,59,77,.3) 40%, rgba(55,59,77,.85) 100%)" }}
          />
          <div className="relative flex items-start justify-between">
            <div className="border border-t-0 border-white/35 bg-forest px-3.5 pt-[22px] pb-3.5">
              <Image src="/images/logo-white.webp" alt="Braveheart Barbershop & Lifestyle Co." width={56} height={65} priority />
            </div>
            <Link
              href="/profile"
              aria-label="Profile"
              className="mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-ink/75 text-[14px] font-semibold text-white no-underline"
            >
              {viewer.firstName.charAt(0).toUpperCase()}
            </Link>
          </div>
          <div className="flex-1" />
          <div className="relative flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
            <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${status.open ? "bg-mint" : "bg-white/60"}`} />
            {status.text} · Pacific Beach
          </div>
          <h1 className="relative mt-2 font-serif text-[32px] leading-[1.1] font-bold">
            {hello}, <em className="text-gold">{viewer.firstName}.</em>
          </h1>
        </header>

        <div className="flex flex-col px-6 pb-8">
          <HomeBooking schedule={schedule} alert={alert} calendarConnected={viewer.calendarConnected} />

          {next && (
            <section aria-label="Your next cut" className="mt-7 flex flex-col">
              <h2 className="font-serif text-[20px] font-bold">Your next cut</h2>
              <Link href="/appointments" className="mt-3 flex items-center gap-3.5 rounded-[4px] bg-white px-4 py-3.5 no-underline">
                <span className="flex h-[52px] w-12 flex-none flex-col items-center justify-center border-[1.5px] border-forest">
                  <span className="text-[9px] font-semibold tracking-[0.12em]">{next.month}</span>
                  <span className="font-serif text-[21px] leading-none font-bold">{next.day}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <strong className="text-[15px] font-semibold">
                    {next.whenLabel} with {next.barberName}
                  </strong>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">
                    {next.repeatLabel ? (
                      <>
                        <RepeatIcon size={13} strokeWidth={2} /> Repeats {next.repeatLabel.toLowerCase()}
                      </>
                    ) : (
                      `${next.serviceName} · $${next.price}`
                    )}
                  </span>
                </span>
                <ChevronRightIcon size={18} />
              </Link>
            </section>
          )}
        </div>
      </main>
      <BottomNav active="/home" />
    </>
  );
}
