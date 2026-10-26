import { NextResponse } from "next/server";
import { isDemo } from "@/lib/env";

export const maxDuration = 300;

/** Daily job (see vercel.json): book the next repeat of each recurring series. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isDemo) return NextResponse.json({ skipped: "demo mode" });
  const { bookRecurring } = await import("@/lib/jobs");
  return NextResponse.json(await bookRecurring());
}
