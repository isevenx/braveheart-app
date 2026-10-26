"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { bookAppointment } from "@/app/actions";
import { CalendarIcon, CheckIcon } from "@/components/Icons";
import { btnPrimary, input, label } from "@/components/ui";
import type { BookingResult } from "@/lib/booking";

type Props = {
  header: React.ReactNode;
  request: { serviceId: string; barberId: string; date: string; time: string; repeat: string | null };
  summary: {
    serviceName: string;
    price: number;
    whenWho: string;
    barberFirst: string;
    repeatLabel: string | null;
    editService: string;
    editTime: string;
    address: string;
  };
  viewer: { calendarConnected: boolean; addBookings: boolean; sms: boolean; hasPhone: boolean } | null;
};

export function ConfirmForm({ header, request, summary, viewer }: Props) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<BookingResult | null>(null);

  if (result?.ok) return <Booked result={result} signedIn={Boolean(viewer)} />;

  function submit(form: FormData) {
    start(async () => {
      const res = await bookAppointment({
        ...request,
        note: (form.get("note") as string) || null,
        addToCalendar: form.get("addToCalendar") === "on",
        textReminder: viewer ? form.get("textReminder") === "on" : undefined,
        guest: viewer
          ? undefined
          : { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") },
      });
      setResult(res);
    });
  }

  return (
    <form action={submit} className="flex flex-1 flex-col">
      {header}
      <dl className="mt-[18px] flex flex-col rounded-[4px] bg-white px-4 py-1">
        <Row term="Service" value={summary.serviceName} edit={summary.editService} />
        <Row term="When & who" value={summary.whenWho} edit={summary.editTime} />
        {summary.repeatLabel && <Row term="Repeats" value={summary.repeatLabel} edit={summary.editTime} />}
        <Row term="Where" value={summary.address} last />
      </dl>

      {viewer?.calendarConnected && (
        <div className="mt-3 flex items-center gap-2 rounded-[4px] bg-forest px-3 py-2.5 text-[12px] text-white">
          <CheckIcon size={16} />
          <span>Fits your calendar.</span>
        </div>
      )}

      {viewer ? (
        <fieldset className="mt-3.5 flex flex-col border-0 p-0">
          <legend className="sr-only">Options</legend>
          {viewer.calendarConnected && (
            <label className="flex min-h-11 items-center gap-3 text-[13px]">
              <input type="checkbox" name="addToCalendar" defaultChecked={viewer.addBookings} className="m-0 h-5 w-5 accent-forest" />
              Add to my Google Calendar
            </label>
          )}
          {viewer.hasPhone && (
            <label className="flex min-h-11 items-center gap-3 text-[13px]">
              <input type="checkbox" name="textReminder" defaultChecked={viewer.sms} className="m-0 h-5 w-5 accent-forest" />
              Text me a reminder before
            </label>
          )}
        </fieldset>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-[13px] text-muted">Booking as a guest. We&apos;ll email your confirmation.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="g-name" className={label}>Full name</label>
            <input id="g-name" name="name" required autoComplete="name" className={input} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="g-email" className={label}>Email</label>
            <input id="g-email" name="email" type="email" required autoComplete="email" className={input} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="g-phone" className={label}>Mobile (optional)</label>
            <input id="g-phone" name="phone" type="tel" autoComplete="tel" className={input} />
          </div>
        </div>
      )}

      <label htmlFor="note" className={`${label} mt-2`}>
        Note for {summary.barberFirst} (optional)
      </label>
      <textarea
        id="note"
        name="note"
        rows={2}
        maxLength={300}
        placeholder="e.g. Keeping some length on top for the wedding"
        className="mt-1.5 resize-none rounded-[4px] border border-line bg-white px-3.5 py-2.5 text-[15px] focus:border-forest focus:outline-none"
      />

      {result && !result.ok && (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-[#9B2C2C]">
          {result.error}{" "}
          <Link href={summary.editTime} className="underline">
            Pick another time
          </Link>
        </p>
      )}

      <div className="flex-1" />
      <div className="mt-6 mb-3 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">Total · pay at the shop</span>
        <span className="font-serif text-[26px] font-bold text-forest">${summary.price}</span>
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Booking…" : "Confirm booking"}
      </button>
    </form>
  );
}

function Row({ term, value, edit, last }: { term: string; value: string; edit?: string; last?: boolean }) {
  return (
    <div className={`flex min-h-[58px] items-center gap-3 ${last ? "" : "border-b border-line-soft"}`}>
      <div className="flex flex-1 flex-col gap-0.5">
        <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{term}</dt>
        <dd className="m-0 text-[14px] font-semibold">{value}</dd>
      </div>
      {edit && (
        <Link href={edit} className="py-2.5 pl-2 text-[13px] font-semibold text-forest no-underline">
          Edit
        </Link>
      )}
    </div>
  );
}

function Booked({ result, signedIn }: { result: Extract<BookingResult, { ok: true }>; signedIn: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <div className="flex-1" />
      <Image src="/images/logo-green.webp" alt="Braveheart Barbershop & Lifestyle Co." width={110} height={127} />
      <h2 className="mt-7 font-serif text-[42px] leading-[1.05] font-bold text-forest italic">you&apos;re booked.</h2>
      <p className="mt-3.5 text-[16px] font-semibold">{result.whenLabel}</p>
      <p className="mt-1 text-[14px] text-muted">
        {result.serviceName} with {result.barberName}
        {result.repeatLabel ? ` · repeats ${result.repeatLabel.toLowerCase()}` : ""}
      </p>
      {result.addedToCalendar && (
        <div className="mt-[18px] flex items-center gap-2 rounded-[4px] bg-forest px-3.5 py-2.5 text-[12px] text-white">
          <CalendarIcon size={16} />
          Added to your Google Calendar
        </div>
      )}
      <div className="flex-1" />
      <Link href={signedIn ? "/home" : "/"} className={`${btnPrimary} mt-8`}>
        Done
      </Link>
      {!signedIn && (
        <Link href="/signup" className="mt-3 text-[14px] font-semibold text-forest">
          Create an account to book around your calendar
        </Link>
      )}
    </div>
  );
}
