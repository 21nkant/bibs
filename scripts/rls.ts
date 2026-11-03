// Supabase exposes the public schema over its REST API with the browser (publishable) key.
// Enabling RLS with no policies closes that door; the app talks to Postgres directly on the server.
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { prepare: false });
for (const t of ["profiles", "fields", "games", "game_players", "agent_usage"]) {
  await sql.unsafe(`alter table public.${t} enable row level security`);
}
const rows = await sql`select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1`;
console.log(rows.map((r) => `${r.tablename}: rls=${r.rowsecurity}`).join("\n"));
await sql.end();
