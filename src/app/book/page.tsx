import { TopBar, StepHeader, Title, Accent } from "@/components/ui";
import { usualServiceId } from "@/lib/appointments";
import { SERVICE_GROUPS, getService, DEFAULT_SERVICE_ID } from "@/lib/shop";
import { getViewer } from "@/lib/viewer";
import { ServicePicker } from "./ServicePicker";

type Search = { date?: string; time?: string; service?: string };

export default async function BookService({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const usual = await usualServiceId(viewer);
  const initial = getService(sp.service)?.id ?? usual ?? DEFAULT_SERVICE_ID;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-col px-6 pt-5">
        <TopBar back={viewer ? "/home" : "/"} />
        <StepHeader step={1} of={3} label="Service" />
        <Title center>
          What do you <Accent>need?</Accent>
        </Title>
      </div>
      <ServicePicker groups={SERVICE_GROUPS} initial={initial} usual={usual} carry={{ date: sp.date, time: sp.time }} />
    </main>
  );
}
