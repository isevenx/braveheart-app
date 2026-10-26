import { TopBar } from "@/components/ui";

// PLACEHOLDER: have the shop (or its lawyer) replace this before launch.
// Google requires a public privacy policy URL to approve the Calendar permissions.
export default function Privacy() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-10 text-[14px] leading-[1.6]">
      <TopBar back="/" />
      <h1 className="mt-4 font-serif text-[30px] font-bold">Privacy Policy</h1>
      <p className="mt-2 text-[12px] text-muted">Draft — to be reviewed before launch.</p>
      <h2 className="mt-6 font-semibold">What we read from your Google Calendar</h2>
      <p className="mt-1">
        Your free/busy times, so we only show appointment slots that fit your schedule. If you allow it, the titles of
        upcoming events, so we can suggest a haircut before important days. We never change, delete or share your events.
        We only add the appointments you book, and only if you turn that on.
      </p>
      <h2 className="mt-5 font-semibold">AI processing</h2>
      <p className="mt-1">
        Event titles you allow us to read are sent to an AI model (Anthropic&apos;s Claude) to decide whether an event is a
        big day. They are not used to train models and are not stored beyond the alerts we show you.
      </p>
      <h2 className="mt-5 font-semibold">What we store</h2>
      <p className="mt-1">Your name, email, optional mobile number, your appointments, and your alert preferences.</p>
      <h2 className="mt-5 font-semibold">Your choices</h2>
      <p className="mt-1">
        Disconnect your calendar or turn off alerts anytime in Profile. To delete your account, contact the shop at (858)
        352-6232.
      </p>
    </main>
  );
}
