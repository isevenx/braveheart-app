import Link from "next/link";
import { cancelAppointmentAction, stopSeries } from "@/app/actions";
import { BottomNav } from "@/components/BottomNav";
import { RepeatIcon } from "@/components/Icons";
import { Accent, btnPrimary } from "@/components/ui";
import { activeSeries, upcomingAppointments } from "@/lib/appointments";
import { requireViewer } from "@/lib/viewer";

// Personalised + time-dependent: render on every request.
export const dynamic = "force-dynamic";

export default async function Appointments() {
  const viewer = await requireViewer();
  const [upcoming, series] = await Promise.all([upcomingAppointments(viewer), activeSeries(viewer)]);

  return (
    <>
      <main className="flex flex-1 flex-col px-6 pt-8 pb-8">
        <h1 className="font-serif text-[32px] leading-[1.1] font-bold">
          Your <Accent>appointments.</Accent>
        </h1>

        <section aria-label="Upcoming" className="mt-6 flex flex-col gap-2.5">
          <h2 className="eyebrow">Upcoming</h2>
          {upcoming.length === 0 && (
            <div className="flex flex-col gap-4 rounded-[4px] bg-white p-5">
              <p className="text-[14px] text-muted">Nothing booked yet.</p>
              <Link href="/book" className={btnPrimary}>
                Book a cut
              </Link>
            </div>
          )}
          {upcoming.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 rounded-[4px] bg-white px-4 py-3.5">
              <span className="flex h-[52px] w-12 flex-none flex-col items-center justify-center border-[1.5px] border-forest">
                <span className="text-[9px] font-semibold tracking-[0.12em]">{a.month}</span>
                <span className="font-serif text-[21px] leading-none font-bold">{a.day}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <strong className="text-[15px] font-semibold">
                  {a.whenLabel} with {a.barberName}
                </strong>
                <span className="text-[12px] text-muted">
                  {a.serviceName} · ${a.price}
                  {a.repeatLabel ? ` · ${a.repeatLabel}` : ""}
                </span>
              </span>
              <form action={cancelAppointmentAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="h-11 px-1 text-[13px] font-semibold text-[#9B2C2C]">
                  Cancel
                </button>
              </form>
            </div>
          ))}
        </section>

        {series.length > 0 && (
          <section aria-label="Recurring" className="mt-8 flex flex-col gap-2.5">
            <h2 className="eyebrow">Recurring</h2>
            {series.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-[4px] border-[1.5px] border-line px-4 py-3.5">
                <RepeatIcon size={18} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong className="text-[14px] font-semibold">{s.label}</strong>
                  <span className="text-[12px] text-muted">
                    {s.serviceName} with {s.barberName}. We book each one ahead and flag clashes.
                  </span>
                </span>
                <form action={stopSeries}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="h-11 px-1 text-[13px] font-semibold">
                    Stop
                  </button>
                </form>
              </div>
            ))}
          </section>
        )}
      </main>
      <BottomNav active="/appointments" />
    </>
  );
}
