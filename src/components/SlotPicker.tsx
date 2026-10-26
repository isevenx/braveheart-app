"use client";

import { useEffect, useRef } from "react";
import type { DaySummary, Slot } from "@/lib/availability";
import { CalendarIcon } from "./Icons";

export type PickerData = {
  days: DaySummary[];
  slotsByDate: Record<string, Slot[]>;
  eventDates: Record<string, string>;
  rangeLabel: string;
};

const neutral = "border-line bg-white text-ink";
const picked = "border-gold bg-gold text-ink";

/**
 * The "When you're free" block: scrolling day strip + grid of times that fit.
 * Nothing is highlighted until the customer taps a day, then a time.
 */
export function SlotPicker({
  data,
  date,
  time,
  onDate,
  onTime,
  barberId,
  freeLabel = "You’re free",
  heading,
}: {
  data: PickerData;
  date: string | null;
  time: string | null;
  onDate: (d: string) => void;
  onTime: (t: string) => void;
  /** Only show times this barber can take ("any" or undefined = all barbers). */
  barberId?: string;
  freeLabel?: string;
  heading: React.ReactNode;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const filter = (slots: Slot[]) =>
    !barberId || barberId === "any" ? slots : slots.filter((s) => s.barberIds.includes(barberId));

  // Bring the selected day into view (e.g. after "Find a time" on a big-day card).
  useEffect(() => {
    if (!date) return;
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [date]);

  const slots = date ? filter(data.slotsByDate[date] ?? []) : [];
  const event = date ? data.eventDates[date] : undefined;

  return (
    <section aria-label="Times that fit your calendar" className="flex flex-col">
      <div className="flex items-center justify-between">
        {heading}
        <span className="flex h-9 items-center gap-1.5 text-[12px] font-medium text-muted">
          {data.rangeLabel}
          <CalendarIcon size={16} />
        </span>
      </div>

      <div
        ref={stripRef}
        role="group"
        aria-label="Day, scroll for more"
        className="no-scrollbar -mx-6 mt-2.5 flex snap-x gap-1.5 overflow-x-auto px-6 pt-0.5 pb-1"
        style={{ scrollPaddingInline: 24 }}
      >
        {data.days.map((d) => {
          const fits = filter(data.slotsByDate[d.date] ?? []).length;
          const on = d.date === date;
          const ev = data.eventDates[d.date];
          return (
            <button
              key={d.date}
              type="button"
              data-date={d.date}
              disabled={d.closed}
              aria-pressed={on}
              aria-label={`${d.longLabel}${d.closed ? ", closed" : `, ${fits} times fit`}${ev ? `, ${ev} on your calendar` : ""}`}
              onClick={() => onDate(d.date)}
              className={`relative flex h-[68px] w-[46px] flex-none snap-start flex-col items-center justify-center gap-0.5 rounded-[4px] border-[1.5px] ${
                d.closed ? "cursor-default border-line-soft bg-transparent text-closed" : on ? picked : neutral
              }`}
            >
              <span className="text-[11px] font-medium">{d.isFirstOfMonth ? d.monthShort.toUpperCase() : d.weekday}</span>
              <span className="font-serif text-[18px] font-bold">{d.dayOfMonth}</span>
              <span className="text-[10px] font-semibold">{d.closed ? "Closed" : `${fits} fit`}</span>
              {ev && (
                <span aria-hidden="true" className={`absolute top-[5px] right-[5px] h-1.5 w-1.5 rounded-full ${on ? "bg-ink" : "bg-forest"}`} />
              )}
            </button>
          );
        })}
      </div>

      {!date && <p className="mt-3 text-[13px] text-muted">Tap a day to see times that fit your calendar.</p>}
      {event && (
        <p className="mt-2.5 flex items-center gap-2 text-[12px]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-forest" />
          {event.charAt(0).toUpperCase() + event.slice(1)} is on your calendar this day.
        </p>
      )}

      {date && (
        <div role="group" aria-label="Times" className="mt-3 grid grid-cols-3 gap-2">
          {slots.map((s) => {
            const on = s.time === time;
            return (
              <button
                key={s.time}
                type="button"
                aria-pressed={on}
                onClick={() => onTime(s.time)}
                className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[4px] border-[1.5px] px-1 ${on ? picked : neutral}`}
              >
                <span className="text-[14px] font-bold">{s.label}</span>
                <span className="text-[10px] font-medium">{freeLabel}</span>
              </button>
            );
          })}
        </div>
      )}
      {date && slots.length === 0 && <p className="mt-1 text-[13px] text-muted">No free times this day. Try another.</p>}
    </section>
  );
}
