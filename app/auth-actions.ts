"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { STARTING_RATING } from "@/lib/types";

export type AuthState = { error?: string } | undefined;

// Not exported: a "use server" module may only export async functions.
const DEMO_ACCOUNTS = {
  alex: "alex@bibs.test",
  sam: "sam@bibs.test",
} as const;
const DEMO_PASSWORD = "bibs-demo-2026";

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Add your name").max(40),
  email: z.email("That email doesn't look right"),
  password: z.string().min(8, "Use at least 8 characters"),
  position: z.enum(["gk", "outfield"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, position, level } = parsed.data;

  // Admin create with email_confirm so players can start right away (no inbox round-trip).
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return { error: /already/i.test(error?.message ?? "") ? "That email already has an account. Log in instead." : "Couldn't create your account. Try again." };
  }

  await db.insert(schema.profiles).values({
    id: data.user.id,
    name,
    position,
    level,
    rating: STARTING_RATING[level],
  });

  const supabase = await supabaseServer();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/");
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password." };
  redirect("/");
}

export async function demoLogIn(who: keyof typeof DEMO_ACCOUNTS): Promise<AuthState> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[who],
    password: DEMO_PASSWORD,
  });
  if (error) return { error: "Demo account unavailable right now." };
  redirect("/");
}

export async function logOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/welcome");
}

export async function isSignedIn() {
  return (await getUserId()) !== null;
}
