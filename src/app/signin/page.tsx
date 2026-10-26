import Link from "next/link";
import { GoogleButton } from "@/components/GoogleButton";
import { Accent, Title, TopBar } from "@/components/ui";
import { hasEmailSignIn, isDemo } from "@/lib/env";
import { EmailSignInForm } from "./EmailSignInForm";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ check?: string; error?: string }> }) {
  const { check, error } = await searchParams;
  return (
    <main className="flex flex-1 flex-col px-6 pt-5 pb-7">
      <TopBar back="/" />
      <Title>
        Welcome <Accent>back.</Accent>
      </Title>

      {check === "email" ? (
        <div className="mt-6 rounded-[4px] bg-white p-5">
          <strong className="font-serif text-[22px]">Check your email.</strong>
          <p className="mt-2 text-[14px] leading-[1.55] text-muted">We sent you a sign-in link. Open it on this phone.</p>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="mt-4 text-[13px] font-semibold text-[#9B2C2C]">
              That sign-in didn&apos;t work. Please try again.
            </p>
          )}
          <div className="mt-6">
            <GoogleButton redirectTo="/home" />
          </div>
          {(isDemo || hasEmailSignIn) && (
            <>
              <div className="mt-[18px] flex items-center gap-3 text-[12px] text-muted">
                <div className="h-px flex-1 bg-line" />
                or get a link by email
                <div className="h-px flex-1 bg-line" />
              </div>
              <EmailSignInForm />
            </>
          )}
        </>
      )}

      <div className="flex-1" />
      <p className="mt-8 text-center text-[13px] text-muted">
        New here? <Link href="/signup" className="font-semibold text-forest">Create an account</Link>
      </p>
    </main>
  );
}
