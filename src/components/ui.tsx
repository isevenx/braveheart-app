import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon } from "./Icons";

export const btnPrimary =
  "flex h-14 w-full items-center justify-center rounded-[4px] bg-gold font-serif text-[18px] font-bold text-ink no-underline transition active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60";
export const btnDisabled =
  "flex h-14 w-full items-center justify-center rounded-[4px] border-[1.5px] border-line bg-transparent font-serif text-[17px] font-bold text-muted";
export const btnGhost = "flex h-11 w-full items-center justify-center text-[14px] font-medium no-underline";
export const input =
  "h-12 w-full rounded-[4px] border border-line bg-white px-3.5 text-[16px] text-ink placeholder:text-[#9A9384] focus:border-forest focus:outline-none";
export const label = "text-[12px] font-semibold tracking-[0.04em] text-muted";

export function LogoMark({ size = 44, variant = "green" }: { size?: number; variant?: "green" | "white" }) {
  const w = Math.round((size * 220) / 254);
  return (
    <Image
      src={variant === "green" ? "/images/logo-green.webp" : "/images/logo-white.webp"}
      alt="Braveheart Barbershop & Lifestyle Co."
      width={w}
      height={size}
      priority
    />
  );
}

/** Back arrow + small centred logo, used at the top of every flow screen. */
export function TopBar({ back, backLabel = "Back" }: { back: string; backLabel?: string }) {
  return (
    <div className="flex h-11 items-center justify-between">
      <Link href={back} aria-label={backLabel} className="-ml-2.5 flex h-11 w-11 items-center justify-center">
        <ChevronLeftIcon size={22} />
      </Link>
      <LogoMark size={44} />
      <div className="w-[34px]" />
    </div>
  );
}

/** "STEP 1 OF 3 · SERVICE" over progress bars, centred (as edited in the design). */
export function StepHeader({ step, of, label: text }: { step: number; of: number; label?: string }) {
  return (
    <div className="mt-[18px] flex flex-col items-center gap-2.5">
      <span className="eyebrow">
        Step {step} of {of}
        {text ? ` · ${text}` : ""}
      </span>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: of }, (_, i) => (
          <div key={i} className={`h-[3px] w-7 ${i < step ? "bg-gold" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

export function Title({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h1 className={`mt-3 font-serif text-[32px] font-bold leading-[1.08] ${center ? "text-center" : ""}`}>{children}</h1>
  );
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <em className="text-forest">{children}</em>;
}
