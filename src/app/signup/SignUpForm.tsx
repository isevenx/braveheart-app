"use client";

import Link from "next/link";
import { useActionState } from "react";
import { emailSignUp, type FormState } from "@/app/actions";
import { btnPrimary, input, label } from "@/components/ui";

export function SignUpForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(emailSignUp, undefined);

  if (state?.sent) {
    return (
      <div className="mt-6 rounded-[4px] bg-white p-5">
        <strong className="font-serif text-[22px]">Check your email.</strong>
        <p className="mt-2 text-[14px] leading-[1.55] text-muted">
          We sent you a sign-in link. Open it on this phone to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-1 flex-col">
      <div className="mt-[18px] flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className={label}>Full name</label>
          <input id="name" name="name" autoComplete="name" placeholder="First and last" className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@email.com" className={input} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={label}>Mobile · for appointment reminders</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="(619) 555-0123" className={input} />
        </div>
        <label className="flex min-h-11 items-center gap-2.5 text-[13px]">
          <input type="checkbox" name="smsReminders" defaultChecked className="m-0 h-5 w-5 accent-forest" />
          Text me reminders before appointments
        </label>
      </div>

      {state?.error && <p role="alert" className="mt-2 text-[13px] font-semibold text-[#9B2C2C]">{state.error}</p>}
      {!emailEnabled && (
        <p className="mt-2 text-[12px] text-muted">Email sign-up turns on once email sending is configured. Google works now.</p>
      )}

      <div className="flex-1" />
      <button type="submit" disabled={pending} className={`${btnPrimary} mt-6 text-[19px]`}>
        {pending ? "Sending link…" : "Continue"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-[1.5] text-muted">
        By continuing you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}
