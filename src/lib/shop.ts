/**
 * Braveheart shop configuration: hours, barbers and services.
 * Prices come from the shop's Vagaro page. DURATIONS ARE PLACEHOLDERS:
 * confirm each one with the shop, since they decide which slots fit.
 */

export const SHOP = {
  name: "Braveheart Barbershop & Lifestyle Co.",
  shortName: "Braveheart",
  address: "972 Garnet Ave, Pacific Beach",
  phone: "(858) 352-6232",
  timeZone: "America/Los_Angeles",
  /** How far ahead customers can book, in days. */
  bookingWindowDays: 21,
  /** Minimum notice before a slot can be booked, in minutes. */
  minNoticeMinutes: 60,
  /** Slot start interval, in minutes. */
  slotStepMinutes: 30,
} as const;

/** Opening hours by ISO weekday (1 = Monday … 7 = Sunday), 24h "HH:mm". */
export const HOURS: Record<number, { open: string; close: string } | null> = {
  1: { open: "10:00", close: "19:00" },
  2: { open: "10:00", close: "19:00" },
  3: { open: "10:00", close: "19:00" },
  4: { open: "10:00", close: "19:00" },
  5: { open: "10:00", close: "19:00" },
  6: { open: "10:00", close: "15:00" },
  7: null,
};

export type Barber = {
  id: string;
  name: string;
  fullName: string;
  photo: string;
  /** Env var holding this barber's Google Calendar ID. */
  calendarEnv: string;
};

export const BARBERS: Barber[] = [
  { id: "jared", name: "Jared", fullName: "Jared Cruz", photo: "/images/barbers/jared.webp", calendarEnv: "CAL_JARED" },
  { id: "camilo", name: "Camilo", fullName: "Camilo Barrientos", photo: "/images/barbers/camilo.webp", calendarEnv: "CAL_CAMILO" },
  { id: "boobi", name: "Boobi", fullName: "Boobi Ronquillo", photo: "/images/barbers/boobi.webp", calendarEnv: "CAL_BOOBI" },
  { id: "john", name: "John", fullName: "John Huang", photo: "/images/barbers/john.webp", calendarEnv: "CAL_JOHN" },
];

export function barberCalendarId(b: Barber): string | undefined {
  return process.env[b.calendarEnv] || undefined;
}

export type Service = {
  id: string;
  name: string;
  price: number;
  /** PLACEHOLDER — confirm with the shop. */
  minutes: number;
  desc?: string;
};

export type ServiceGroup = { title: string; items: Service[] };

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    title: "Haircuts",
    items: [
      { id: "cut", name: "Haircut", price: 55, minutes: 45, desc: "Hot and cold towel on request. Hair wash is on us." },
      { id: "scissor", name: "All Scissor Cut", price: 65, minutes: 60, desc: "Shears-only cut. Hot and cold towel on request, wash included." },
    ],
  },
  {
    title: "Cut + beard or shave",
    items: [
      { id: "cut-beard", name: "Haircut w/ Beard Trim", price: 75, minutes: 60, desc: "Your cut plus the beard taken down to your length." },
      { id: "cut-shave", name: "Haircut w/ Face Shave", price: 80, minutes: 60, desc: "Hot-towel razor shave. Wash and styling included." },
      { id: "scissor-beard", name: "All Scissor Cut w/ Beard Trim", price: 85, minutes: 75 },
      { id: "scissor-shave", name: "All Scissor Cut w/ Face Shave", price: 90, minutes: 75 },
    ],
  },
  {
    title: "Shaves & beard",
    items: [
      { id: "beard", name: "Beard Trim", price: 35, minutes: 30, desc: "Clippers or shears, optional razor finish, cold towel and moisturizer." },
      { id: "shave", name: "Head Shave / Face Shave", price: 40, minutes: 30, desc: "Hot towel and steam for a smooth razor finish." },
      { id: "head-face", name: "Head Shave w/ Face Shave", price: 60, minutes: 45 },
    ],
  },
];

export const SERVICES: Service[] = SERVICE_GROUPS.flatMap((g) => g.items);
export const DEFAULT_SERVICE_ID = "cut";

export function getService(id: string | null | undefined): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getBarber(id: string | null | undefined): Barber | undefined {
  return BARBERS.find((b) => b.id === id);
}
