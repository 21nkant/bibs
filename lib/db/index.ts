import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase transaction pooler (port 6543): no prepared statements, and no pipelining.
// postgres-js pipelines concurrent queries onto one connection by default; through the pooler that
// can stall a connection forever (server waiting in ClientRead). max_pipeline: 1 = one query in
// flight per connection; extra queries wait in postgres-js's queue instead.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client =
  globalForDb.pg ??
  postgres(process.env.POSTGRES_URL!, { prepare: false, max: 10, max_pipeline: 1, idle_timeout: 20 });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
