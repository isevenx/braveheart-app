import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { hasEmailSignIn } from "./env";

export const CALENDAR_SCOPES = {
  /** Needed to line up free/busy times. Always requested. */
  freeBusy: "https://www.googleapis.com/auth/calendar.freebusy",
  /** Read event titles (big-day alerts) and add bookings to the customer's calendar. */
  events: "https://www.googleapis.com/auth/calendar.events",
};

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/signin", verifyRequest: "/signin?check=email", error: "/signin" },
  providers: [
    Google({
      // Sign-in asks only for name + email. Calendar access is requested
      // separately on the Connect Calendar screen (incremental authorization).
      authorization: { params: { scope: "openid email profile", access_type: "offline", prompt: "consent" } },
      // Google verifies emails, so it is safe to attach Google to a guest/email account.
      allowDangerousEmailAccountLinking: true,
    }),
    ...(hasEmailSignIn ? [Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.EMAIL_FROM })] : []),
  ],
  callbacks: {
    async signIn({ account, user }) {
      // Auth.js does not refresh stored tokens on later sign-ins, so do it here.
      // This is how the calendar scopes granted on Connect Calendar get saved.
      if (account?.provider === "google" && user?.id) {
        await db
          .update(schema.accounts)
          .set({
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            id_token: account.id_token,
            ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
          })
          .where(and(eq(schema.accounts.provider, "google"), eq(schema.accounts.providerAccountId, account.providerAccountId)));
        if (account.scope?.includes(CALENDAR_SCOPES.freeBusy)) {
          await db.update(schema.users).set({ calendarConnected: true }).where(eq(schema.users.id, user.id));
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const email = user.email.toLowerCase();
      const pending = await db.query.pendingProfiles.findFirst({ where: eq(schema.pendingProfiles.email, email) });
      if (!pending) return;
      await db
        .update(schema.users)
        .set({ name: pending.name ?? user.name, phone: pending.phone, smsReminders: pending.smsReminders })
        .where(eq(schema.users.id, user.id));
      await db.delete(schema.pendingProfiles).where(eq(schema.pendingProfiles.email, email));
    },
  },
}));
