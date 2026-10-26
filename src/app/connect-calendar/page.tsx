import Link from "next/link";
import { connectCalendar } from "@/app/actions";
import { LockIcon } from "@/components/Icons";
import { Accent, StepHeader, Title, TopBar, btnGhost, btnPrimary } from "@/components/ui";
import { requireViewer } from "@/lib/viewer";

// Personalised + time-dependent: render on every request.
export const dynamic = "force-dynamic";

const hatch = "repeating-linear-gradient(135deg, #C9C1B0 0 3px, #E3DCCD 3px 7px)";

export default async function ConnectCalendar() {
  const viewer = await requireViewer();
  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-7">
      <TopBar back="/signup" />
      <StepHeader step={2} of={2} />
      <Title>
        Connect your <Accent>calendar.</Accent>
      </Title>
      <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
        We line up your Google Calendar with the shop&apos;s chairs, so every time you see is one you&apos;re actually free.
      </p>

      {/* You + Open chairs = Fits you */}
      <div
        role="img"
        aria-label="Your busy times plus the shop's open chairs equals times that fit you"
        className="mt-[18px] flex items-end gap-2 rounded-[4px] bg-white p-3.5"
      >
        <div className="flex flex-1 flex-col gap-2">
          <div className="relative h-[104px] bg-cream">
            <div className="absolute inset-x-1.5 top-1.5 h-[38px]" style={{ background: hatch }} />
            <div className="absolute inset-x-1.5 top-16 h-6" style={{ background: hatch }} />
          </div>
          <span className="text-center text-[11px] font-semibold">You</span>
        </div>
        <span aria-hidden="true" className="pb-[70px] text-muted">+</span>
        <div className="flex flex-1 flex-col gap-2">
          <div className="relative h-[104px] bg-cream">
            {[20, 48, 82].map((t) => (
              <div key={t} className="absolute inset-x-1.5 h-[15px] border-[1.5px] border-muted" style={{ top: t }} />
            ))}
          </div>
          <span className="text-center text-[11px] font-semibold">Open chairs</span>
        </div>
        <span aria-hidden="true" className="pb-[70px] text-muted">=</span>
        <div className="flex flex-1 flex-col gap-2">
          <div className="relative h-[104px] bg-forest">
            <div className="absolute inset-x-1.5 top-12 h-[15px] bg-gold" />
          </div>
          <span className="text-center text-[11px] font-bold text-forest">Fits you</span>
        </div>
      </div>

      <form action={connectCalendar} className="flex flex-1 flex-col">
        <fieldset className="mt-4 flex flex-col border-0 p-0">
          <legend className="eyebrow mb-0.5 p-0">What we can see</legend>
          <label className="flex min-h-[54px] items-center gap-3 border-b border-line-soft">
            <span className="flex flex-1 flex-col gap-0.5">
              <strong className="text-[14px] font-semibold">Free / busy times</strong>
              <span className="text-[12px] text-muted">Needed to match open slots</span>
            </span>
            <input type="checkbox" checked disabled readOnly className="m-0 h-5 w-5 accent-forest" />
          </label>
          <label className="flex min-h-[54px] items-center gap-3 border-b border-line-soft">
            <span className="flex flex-1 flex-col gap-0.5">
              <strong className="text-[14px] font-semibold">Event titles</strong>
              <span className="text-[12px] text-muted">So we can spot big days and remind you</span>
            </span>
            <input type="checkbox" name="shareEventTitles" defaultChecked={viewer.shareEventTitles} className="m-0 h-5 w-5 accent-forest" />
          </label>
          <label className="flex min-h-[54px] items-center gap-3">
            <span className="flex flex-1 flex-col gap-0.5">
              <strong className="text-[14px] font-semibold">Add my bookings</strong>
              <span className="text-[12px] text-muted">Appointments land on your calendar</span>
            </span>
            <input type="checkbox" name="addBookingsToCalendar" defaultChecked={viewer.addBookingsToCalendar} className="m-0 h-5 w-5 accent-forest" />
          </label>
        </fieldset>

        <div className="flex-1" />
        <div className="mt-6 mb-3.5 flex items-start gap-2 text-[11px] leading-[1.5] text-muted">
          <LockIcon size={14} className="mt-px flex-none" />
          <span>We never change or share your events. We only add the bookings you make. Disconnect anytime in Profile.</span>
        </div>
        <button type="submit" className={`${btnPrimary} text-[19px]`}>
          Connect Google Calendar
        </button>
      </form>
      <Link href="/home" className={`${btnGhost} mt-1`}>
        Skip for now
      </Link>
    </main>
  );
}
