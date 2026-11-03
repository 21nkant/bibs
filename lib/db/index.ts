import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase transaction pooler (port 6543) doesn't support prepared statements.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client =
  globalForDb.pg ?? postgres(process.env.POSTGRES_URL!, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
