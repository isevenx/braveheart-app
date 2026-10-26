import Link from "next/link";
import { redirect } from "next/navigation";
import { BellIcon, CalendarCheckIcon, RepeatIcon } from "@/components/Icons";
import { LogoMark, btnGhost, btnPrimary } from "@/components/ui";
import { isDemo } from "@/lib/env";
import { SHOP } from "@/lib/shop";
import { getViewer } from "@/lib/viewer";

// Personalised + time-dependent: render on every request.
export const dynamic = "force-dynamic";

const FEATURES = [
  { Icon: CalendarCheckIcon, title: "Slots that fit your week", text: "Your calendar, laid over ours. You only see the overlap." },
  { Icon: BellIcon, title: "A heads-up before big days", text: "Interview, wedding, prom, photoshoot? We'll nudge you to book in time." },
  { Icon: RepeatIcon, title: "Set it and forget it", text: "Recurring cuts weekly, every other week, monthly or quarterly." },
];

export default async function Welcome() {
  // Signed-in customers go straight to Home. (Demo mode always shows the welcome.)
  if (!isDemo && (await getViewer())) redirect("/home");

  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-7">
      <div className="flex items-start justify-between">
        <LogoMark size={88} />
        <Link href="/signin" className="flex h-11 items-center px-1 text-[13px] font-semibold tracking-[0.08em] uppercase no-underline">
          Sign in
        </Link>
      </div>

      <p className="eyebrow mt-7 font-medium">{SHOP.name}</p>
      <h1 className="mt-2.5 font-serif text-[46px] leading-[1.02] font-bold text-forest italic">
        book around
        <br />
        your life.
      </h1>
      <p className="mt-4 text-[15px] leading-[1.55]">
        Connect your Google Calendar and we&apos;ll only show chair times that actually fit your week. No more back-and-forth.
      </p>

      <ul className="mt-[30px] flex flex-col gap-[18px]">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3.5">
            <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[4px] bg-forest text-gold">
              <Icon size={20} />
            </div>
            <div className="flex flex-col gap-[3px]">
              <strong className="text-[15px] font-semibold">{title}</strong>
              <span className="text-[13px] leading-[1.45] text-muted">{text}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex-1" />
      <Link href="/signup" className={`${btnPrimary} mt-8 text-[19px]`}>
        Create free account
      </Link>
      <Link href="/book" className={`${btnGhost} mt-1.5 h-12`}>
        Book once as a guest
      </Link>
      <p className="mt-1 text-center text-[12px] text-muted">
        {SHOP.address} · {SHOP.phone}
      </p>
    </main>
  );
}
