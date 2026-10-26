import Link from "next/link";
import { TopBar, StepHeader, Title, Accent } from "@/components/ui";
import { getSchedule } from "@/lib/schedule";
import { BARBERS, getService, DEFAULT_SERVICE_ID } from "@/lib/shop";
import { getViewer } from "@/lib/viewer";
import { TimePicker } from "./TimePicker";

type Search = { service?: string; date?: string; time?: string; barber?: string; repeat?: string };

export default async function BookTime({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const service = getService(sp.service) ?? getService(DEFAULT_SERVICE_ID)!;
  const schedule = await getSchedule(viewer, { serviceId: service.id });

  // Keep a time picked on Home only if it still fits this service's length.
  const keep = sp.date && sp.time && schedule.slotsByDate[sp.date]?.some((s) => s.time === sp.time);

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col px-6 pt-5">
        <TopBar back={`/book?service=${service.id}`} backLabel="Back to services" />
        <StepHeader step={2} of={3} label="Barber & time" />
        <Title center>
          Who &amp; <Accent>when?</Accent>
        </Title>
        <Link
          href={`/book?service=${service.id}`}
          className="mt-2.5 flex min-h-9 items-center gap-2 self-center rounded-full bg-white px-3 text-[13px] no-underline"
        >
          <span>
            {service.name} · ${service.price}
          </span>
          <span className="font-semibold text-forest">Change</span>
        </Link>
      </div>
      <TimePicker
        schedule={schedule}
        barbers={BARBERS.map(({ id, name, photo }) => ({ id, name, photo }))}
        serviceId={service.id}
        signedIn={Boolean(viewer)}
        calendarConnected={Boolean(viewer?.calendarConnected)}
        initial={{
          barber: sp.barber && (sp.barber === "any" || BARBERS.some((b) => b.id === sp.barber)) ? sp.barber : "any",
          date: keep ? sp.date! : sp.date && schedule.slotsByDate[sp.date] ? sp.date : null,
          time: keep ? sp.time! : null,
          repeat: sp.repeat ?? null,
        }}
      />
    </main>
  );
}
