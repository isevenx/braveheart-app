import "server-only";
import { DateTime } from "luxon";
import { demoWeddingDay } from "./demo";
import { SHOP } from "./shop";
import type { Viewer } from "./viewer";

export type HomeAlert = {
  id: string;
  kind: string;
  heading: string; // "Wedding · Sat, Nov 7"
  eventDate: string; // yyyy-MM-dd
  suggestDate: string; // the day before, where we jump the strip
};

/** The next big day to show on Home, if any. */
export async function getHomeAlert(viewer: Viewer, now = Date.now()): Promise<HomeAlert | null> {
  if (viewer.isDemo) {
    const d = demoWeddingDay(now);
    return { id: "demo", kind: "Wedding", heading: `Wedding · ${d.toFormat("ccc, LLL d")}`, eventDate: d.toISODate()!, suggestDate: d.minus({ days: 1 }).toISODate()! };
  }
  const { db, schema } = await import("./db");
  const { and, asc, eq, gt, inArray, ne } = await import("drizzle-orm");
  const e = schema.eventAlerts;
  const [a] = await db
    .select()
    .from(e)
    .where(and(eq(e.userId, viewer.id), inArray(e.status, ["NEW", "NOTIFIED"]), gt(e.eventStart, new Date(now)), ne(e.kind, "repeat clash")))
    .orderBy(asc(e.eventStart))
    .limit(1);
  if (!a) return null;
  const d = DateTime.fromJSDate(a.eventStart, { zone: SHOP.timeZone });
  let suggest = d.minus({ days: 1 });
  if (suggest.weekday === 7) suggest = suggest.minus({ days: 1 }); // shop closed Sundays
  const kind = a.kind.charAt(0).toUpperCase() + a.kind.slice(1);
  return { id: a.id, kind, heading: `${kind} · ${d.toFormat("ccc, LLL d")}`, eventDate: d.toISODate()!, suggestDate: suggest.toISODate()! };
}
