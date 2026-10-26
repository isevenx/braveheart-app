"use client";

import { useActionState } from "react";
import { emailSignIn, type FormState } from "@/app/actions";
import { btnPrimary, input, label } from "@/components/ui";

export function EmailSignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(emailSignIn, undefined);
  if (state?.sent) {
    return <p className="mt-4 text-[14px] text-muted">Check your email for a sign-in link.</p>;
  }
  return (
    <form action={action} className="mt-[18px] flex flex-col gap-3">
      <label htmlFor="email" className={label}>Email</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@email.com" className={input} />
      {state?.error && <p role="alert" className="text-[13px] font-semibold text-[#9B2C2C]">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}
