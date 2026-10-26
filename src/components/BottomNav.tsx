import Link from "next/link";
import { CalendarIcon, HomeIcon, ScissorsIcon, UserIcon } from "./Icons";

const TABS = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/book", label: "Book", Icon: ScissorsIcon },
  { href: "/appointments", label: "Calendar", Icon: CalendarIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
] as const;

export function BottomNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-10 mt-auto flex border-t border-line-soft bg-white px-2 pt-1.5 pb-[max(20px,env(safe-area-inset-bottom))]"
    >
      {TABS.map(({ href, label, Icon }) => {
        const on = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] no-underline ${on ? "font-semibold text-forest" : "font-medium"}`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
