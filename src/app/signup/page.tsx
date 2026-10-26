import { GoogleButton } from "@/components/GoogleButton";
import { Accent, StepHeader, Title, TopBar } from "@/components/ui";
import { hasEmailSignIn, isDemo } from "@/lib/env";
import { SignUpForm } from "./SignUpForm";

// Personalised + time-dependent: render on every request.
export const dynamic = "force-dynamic";

export default function SignUp() {
  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-7">
      <TopBar back="/" />
      <StepHeader step={1} of={2} />
      <Title>
        Create your <Accent>account.</Accent>
      </Title>
      <p className="mt-2.5 text-[14px] leading-[1.55] text-muted">
        Sign up with Google and we can link your calendar in one tap next.
      </p>

      <div className="mt-[22px]">
        <GoogleButton redirectTo="/connect-calendar" />
      </div>

      <div className="mt-[18px] flex items-center gap-3 text-[12px] text-muted">
        <div className="h-px flex-1 bg-line" />
        or with email
        <div className="h-px flex-1 bg-line" />
      </div>

      <SignUpForm emailEnabled={isDemo || hasEmailSignIn} />
    </main>
  );
}
