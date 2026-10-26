import { googleSignIn } from "@/app/actions";
import { GoogleMark } from "./Icons";

export function GoogleButton({ redirectTo, label = "Continue with Google" }: { redirectTo: string; label?: string }) {
  return (
    <form action={googleSignIn.bind(null, redirectTo)}>
      <button
        type="submit"
        className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[4px] border border-line bg-white text-[15px] font-semibold text-ink"
      >
        <GoogleMark size={20} />
        {label}
      </button>
    </form>
  );
}
