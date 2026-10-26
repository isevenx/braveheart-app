import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// `prepare: false` keeps this compatible with pooled connection URLs (Neon, Supabase).
const client =
  globalForDb.pg ?? postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/braveheart", { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
