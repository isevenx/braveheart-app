import { TopBar } from "@/components/ui";

// PLACEHOLDER: have the shop replace this with its real terms and cancellation policy.
export default function Terms() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-10 text-[14px] leading-[1.6]">
      <TopBar back="/" />
      <h1 className="mt-4 font-serif text-[30px] font-bold">Terms</h1>
      <p className="mt-2 text-[12px] text-muted">Draft — to be reviewed before launch.</p>
      <p className="mt-4">
        Appointments are with Braveheart Barbershop &amp; Lifestyle Co., 972 Garnet Ave, San Diego, CA 92109. Payment is
        taken at the shop. Cancellation and late-arrival terms: [to be provided by the shop].
      </p>
    </main>
  );
}
