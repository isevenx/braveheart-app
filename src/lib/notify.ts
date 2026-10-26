import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { appUrl } from "./env";

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@braveheartpb.com", pub, priv);
  vapidReady = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Send a push notification to every device the customer turned alerts on for. */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureVapid()) return 0;
  const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId));
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id)).catch(() => undefined);
        else console.error("[push] failed", code);
      }
    }),
  );
  return sent;
}

/** Send an email through Resend (https://resend.com). No-op if not configured. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("[email] failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple branded email: heading, a line of text, and one button. */
export function emailHtml(heading: string, text: string, cta: { label: string; path: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#F4EFE4;font-family:Montserrat,Arial,sans-serif;color:#373B4D">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<div style="font-size:11px;letter-spacing:.14em;font-weight:600;color:#5F6372">BRAVEHEART BARBERSHOP &amp; LIFESTYLE CO.</div>
<h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;margin:12px 0 8px">${esc(heading)}</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 24px">${esc(text)}</p>
<a href="${appUrl}${cta.path}" style="display:inline-block;background:#D3B830;color:#373B4D;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:4px">${esc(cta.label)}</a>
<p style="font-size:12px;color:#5F6372;margin-top:32px">972 Garnet Ave, Pacific Beach · (858) 352-6232</p>
</div></body></html>`;
}
