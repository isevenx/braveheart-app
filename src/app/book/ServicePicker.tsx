"use client";

import Link from "next/link";
import { useState } from "react";
import { btnPrimary } from "@/components/ui";
import type { ServiceGroup } from "@/lib/shop";

export function ServicePicker({
  groups,
  initial,
  usual,
  carry,
}: {
  groups: ServiceGroup[];
  initial: string;
  usual: string | null;
  carry: { date?: string; time?: string };
}) {
  const [sel, setSel] = useState(initial);
  const selected = groups.flatMap((g) => g.items).find((s) => s.id === sel)!;
  const params = new URLSearchParams({ service: sel });
  if (carry.date) params.set("date", carry.date);
  if (carry.time) params.set("time", carry.time);

  return (
    <>
      <fieldset className="m-0 flex flex-col border-0 px-6 pb-6">
        <legend className="sr-only">Service</legend>
        {groups.map((g) => (
          <div key={g.title} className="mt-[22px] flex flex-col gap-2">
            <h2 className="eyebrow mb-0.5">{g.title}</h2>
            {g.items.map((s) => {
              const on = s.id === sel;
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-[4px] border-[1.5px] p-3.5 ${on ? "border-forest bg-white" : "border-line-soft bg-transparent"}`}
                >
                  <input
                    type="radio"
                    name="service"
                    value={s.id}
                    checked={on}
                    onChange={() => setSel(s.id)}
                    className="m-0 mt-px h-5 w-5 flex-none accent-forest"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-[15px] font-semibold">{s.name}</strong>
                      {s.id === usual && (
                        <span className="rounded-[2px] bg-forest px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-white">YOUR USUAL</span>
                      )}
                    </span>
                    {s.desc && <span className="text-[12px] leading-[1.45] text-muted">{s.desc}</span>}
                  </span>
                  <span className="flex-none font-serif text-[19px] font-bold">${s.price}</span>
                </label>
              );
            })}
          </div>
        ))}
      </fieldset>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t border-line-soft bg-white px-6 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))]">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="eyebrow">Selected</span>
            <strong className="text-[15px] font-semibold">{selected.name}</strong>
          </div>
          <span className="font-serif text-[24px] font-bold text-forest">${selected.price}</span>
        </div>
        <Link href={`/book/time?${params}`} className={btnPrimary}>
          Next: barber &amp; time
        </Link>
      </div>
    </>
  );
}
