/**
 * Demo mode runs the whole app on sample data with no accounts, database or
 * Google setup, so the UI can be clicked through straight after `npm run dev`.
 * It switches off automatically once the database and Google sign-in are configured.
 */
export const isDemo =
  process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL || !process.env.AUTH_GOOGLE_ID;

export const hasEmailSignIn = Boolean(process.env.AUTH_RESEND_KEY && process.env.EMAIL_FROM);

export const hasShopCalendars = Boolean(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
);

export const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
