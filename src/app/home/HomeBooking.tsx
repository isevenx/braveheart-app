"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { dismissAlert } from "@/app/actions";
import { SlotPicker } from "@/components/SlotPicker";
import { btnDisabled } from "@/components/ui";
import type { HomeAlert } from "@/lib/alerts";
import type { Schedule } from "@/lib/schedule";

export function HomeBooking({
  schedule,
  alert,
  calendarConnected,
}: {
  schedule: Schedule;
  alert: HomeAlert | null;
  calendarConnected: boolean;
}) {
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(Boolean(alert));
  const [, startTransition] = useTransition();

  const chosen = date && time ? schedule.slotsByDate[date]?.find((s) => s.time === time) : undefined;
  const day = schedule.days.find((d) => d.date === date);
  const next = chosen ? `/book?${new URLSearchParams({ date: date!, time: time! })}` : null;

  // How many free times the big-day card can promise (the day before + the day itself).
  const fitsBefore = alert
    ? (schedule.slotsByDate[alert.suggestDate]?.length ?? 0) + (schedule.slotsByDate[alert.eventDate]?.length ?? 0)
    : 0;

  return (
    <>
      {alert && showAlert && (
        <section aria-label="Upcoming event" className="mt-5 flex flex-col rounded-[4px] bg-gold p-5 text-ink">
          <span className="text-[11px] font-semibold tracking-[0.12em]">ON YOUR CALENDAR</span>
          <h2 className="mt-2 font-serif text-[26px] leading-[1.15] font-bold">{alert.heading}</h2>
          <p className="mt-1.5 text-[14px] leading-[1.5]">
            Fresh cut before the big day?{" "}
            {fitsBefore > 0 ? `${fitsBefore} times fit your schedule.` : "We'll find a time that fits."}
          </p>
          <div className="mt-[18px] flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setDate(alert.suggestDate);
                setTime(null);
              }}
              className="h-[50px] flex-1 rounded-[4px] bg-forest font-serif text-[17px] font-bold text-white"
            >
              Find a time
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAlert(false);
                startTransition(() => dismissAlert(alert.id));
              }}
              className="h-[50px] px-1 text-[14px] font-medium"
            >
              Not now
            </button>
          </div>
        </section>
      )}

      {!calendarConnected && (
        <Link href="/connect-calendar" className="mt-5 block rounded-[4px] border-[1.5px] border-forest bg-white p-4 text-[14px] no-underline">
          <strong className="text-forest">Connect your Google Calendar</strong> to only see times you&apos;re free.
        </Link>
      )}

      <div className="mt-8">
        <SlotPicker
          data={schedule}
          date={date}
          time={time}
          onDate={(d) => {
            setDate(d);
            setTime(null);
          }}
          onTime={setTime}
          freeLabel={calendarConnected ? "You’re free" : "Open"}
          heading={<h2 className="font-serif text-[20px] font-bold">Book your next cut</h2>}
        />
      </div>

      {next && day ? (
        <Link
          href={next}
          className="mt-3.5 flex h-[54px] flex-col items-center justify-center gap-px rounded-[4px] bg-gold text-ink no-underline"
        >
          <span className="font-serif text-[17px] font-bold">Choose your service</span>
          <span className="text-[11px] font-semibold">
            {day.longLabel} · {chosen!.label}
          </span>
        </Link>
      ) : (
        <button type="button" disabled className={`${btnDisabled} mt-3.5 h-[54px]`}>
          Choose your service
        </button>
      )}
    </>
  );
}
