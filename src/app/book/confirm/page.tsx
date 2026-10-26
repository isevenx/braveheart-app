import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { StepHeader, Title, TopBar, Accent } from "@/components/ui";
import { frequencyLabel, isFrequency } from "@/lib/recurrence";
import { SHOP, getBarber, getService } from "@/lib/shop";
import { getViewer } from "@/lib/viewer";
import { ConfirmForm } from "./ConfirmForm";

type Search = { service?: string; barber?: string; date?: string; time?: string; repeat?: string };

export default async function Confirm({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const service = getService(sp.service);
  const when = sp.date && sp.time ? DateTime.fromISO(`${sp.date}T${sp.time}`, { zone: SHOP.timeZone }) : null;
  if (!service || !when?.isValid) redirect("/book");

  const viewer = await getViewer();
  const barber = sp.barber === "any" ? null : getBarber(sp.barber);
  const repeat = isFrequency(sp.repeat) ? sp.repeat : null;
  const back = `/book/time?${new URLSearchParams({ service: service.id, date: sp.date!, time: sp.time!, barber: sp.barber ?? "any", ...(repeat ? { repeat } : {}) })}`;

  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-7">
      <ConfirmForm
        header={
          <>
            <TopBar back={back} backLabel="Back to barber and time" />
            <StepHeader step={3} of={3} label="Review" />
            <Title center>
              Look <Accent>good?</Accent>
            </Title>
          </>
        }
        request={{ serviceId: service.id, barberId: barber?.id ?? "any", date: sp.date!, time: sp.time!, repeat }}
        summary={{
          serviceName: service.name,
          price: service.price,
          whenWho: `${when.toFormat("ccc, LLL d")} · ${when.toFormat("h:mm a")} · ${barber?.fullName ?? "Any barber"}`,
          barberFirst: barber?.name ?? "your barber",
          repeatLabel: repeat ? frequencyLabel(repeat) : null,
          editService: `/book?service=${service.id}`,
          editTime: back,
          address: SHOP.address,
        }}
        viewer={viewer ? { calendarConnected: viewer.calendarConnected, addBookings: viewer.addBookingsToCalendar, sms: viewer.smsReminders, hasPhone: Boolean(viewer.phone) } : null}
      />
    </main>
  );
}
