import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/types";
import { supabaseServer } from "@/lib/supabase/server";

// The signed-in user's id, verified from the session JWT. This is the ONLY source of identity:
// server actions and assistant tools take the user from here, never from client or model input.
export async function getUserId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) redirect("/welcome");
  return id;
}

export async function requireProfile(): Promise<Profile> {
  const id = await requireUserId();
  const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id));
  if (!row) redirect("/signup?step=profile");
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    level: row.level,
    rating: row.rating,
    gamesPlayed: row.gamesPlayed,
  };
}
