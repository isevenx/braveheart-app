"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RepeatIcon } from "@/components/Icons";
import { SlotPicker } from "@/components/SlotPicker";
import { btnDisabled, btnPrimary } from "@/components/ui";
import { FREQUENCIES } from "@/lib/recurrence";
import type { Schedule } from "@/lib/schedule";

type BarberLite = { id: string; name: string; photo: string };

export function TimePicker({
  schedule,
  barbers,
  serviceId,
  signedIn,
  calendarConnected,
  initial,
}: {
  schedule: Schedule;
  barbers: BarberLite[];
  serviceId: string;
  signedIn: boolean;
  calendarConnected: boolean;
  initial: { barber: string; date: string | null; time: string | null; repeat: string | null };
}) {
  const [barber, setBarber] = useState(initial.barber);
  const [date, setDate] = useState<string | null>(initial.date);
  const [time, setTime] = useState<string | null>(initial.time);
  const [repeat, setRepeat] = useState(Boolean(initial.repeat));
  const [freq, setFreq] = useState<string>(initial.repeat ?? "3w");

  const slot =
    date && time
      ? schedule.slotsByDate[date]?.find((s) => s.time === time && (barber === "any" || s.barberIds.includes(barber)))
      : undefined;
  const day = schedule.days.find((d) => d.date === date);
  const who = barber === "any" ? "any barber" : barbers.find((b) => b.id === barber)?.name;
  const freqLabel = FREQUENCIES.find((f) => f.id === freq)?.label ?? "";

  const review = slot
    ? `/book/confirm?${new URLSearchParams({ service: serviceId, barber, date: date!, time: time!, ...(repeat ? { repeat: freq } : {}) })}`
    : null;

  return (
    <>
      <div className="flex flex-col px-6 pb-6">
        <h2 className="eyebrow mt-6 mb-2.5">Barber</h2>
        <div role="group" aria-label="Barber" className="flex gap-3.5">
          {[{ id: "any", name: "Any", photo: "" }, ...barbers].map((b) => {
            const on = b.id === barber;
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setBarber(b.id);
                  // Drop a chosen time this barber can't take.
                  if (date && time && b.id !== "any" && !schedule.slotsByDate[date]?.some((s) => s.time === time && s.barberIds.includes(b.id))) setTime(null);
                }}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full font-serif text-[20px] font-bold ${
                    b.photo ? "bg-white" : on ? "bg-gold" : "bg-white"
                  }`}
                  style={{ boxShadow: on ? "0 0 0 2px #F4EFE4, 0 0 0 4px #D3B830" : "0 0 0 1.5px #D6CEBD" }}
                >
                  {b.photo ? <Image src={b.photo} alt="" width={54} height={54} className="h-[54px] w-[54px] object-cover" /> : "★"}
                </span>
                <span className="text-[12px] font-semibold">{b.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <SlotPicker
            data={schedule}
            date={date}
            time={time}
            barberId={barber}
            onDate={(d) => {
              setDate(d);
              setTime(null);
            }}
            onTime={setTime}
            freeLabel={calendarConnected ? "You’re free" : "Open"}
            heading={<h2 className="font-serif text-[20px] font-bold">When you&apos;re free</h2>}
          />
        </div>

        {signedIn && (
          <div className="mt-5 flex flex-col border-t border-line-soft pt-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <RepeatIcon size={18} />
              <span className="flex-1 text-[14px] font-semibold">Make it recurring</span>
              <input
                type="checkbox"
                role="switch"
                checked={repeat}
                onChange={(e) => setRepeat(e.target.checked)}
                className="m-0 h-5 w-5 accent-forest"
              />
            </label>
            {repeat && (
              <>
                <div role="group" aria-label="How often" className="mt-2 flex flex-wrap gap-2">
                  {FREQUENCIES.map((f) => {
                    const on = f.id === freq;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFreq(f.id)}
                        className={`h-[38px] rounded-full border-[1.5px] px-3 text-[12px] font-semibold ${on ? "border-gold bg-gold" : "border-line bg-transparent"}`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-[12px] leading-[1.45] text-muted">
                  Same barber and time. We&apos;ll check your calendar before each one and flag clashes.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t border-line-soft bg-white px-6 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-0.5">
          <span className="eyebrow">{repeat ? `Repeats ${freqLabel}` : "Your appointment"}</span>
          <strong className="text-[15px] font-semibold">
            {slot && day ? `${day.longLabel} · ${slot.label} · ${who}` : date && day ? `Pick a time on ${day.longLabel}` : "Pick a day and time"}
          </strong>
        </div>
        {review ? (
          <Link href={review} className={btnPrimary}>
            Review booking
          </Link>
        ) : (
          <button type="button" disabled className={btnDisabled}>
            Review booking
          </button>
        )}
      </div>
    </>
  );
}
