"use server";

// Thin server actions: identity from the session, rules in the service layer.
// Both the Join button and the assistant's "Hold my spot" button call joinGameAction.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { createGame, joinGame, leaveGame, lockGame, submitResult } from "@/lib/service";
import { nyWallTime } from "@/lib/agent/time";
import { redirect } from "next/navigation";
import type { JoinResult, LeaveResult, LockResult, ResultResult } from "@/lib/types";

const id = z.uuid();
const score = z.number().int().min(0).max(30);

function refresh(gameId: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/games/${gameId}`);
}

export async function joinGameAction(gameId: string): Promise<JoinResult> {
  const userId = await requireUserId();
  if (!id.safeParse(gameId).success) return { ok: false, error: "not_found", message: "That game doesn't exist." };
  const result = await joinGame(userId, gameId);
  refresh(gameId);
  return result;
}

export async function leaveGameAction(gameId: string): Promise<LeaveResult> {
  const userId = await requireUserId();
  if (!id.safeParse(gameId).success) return { ok: false, error: "not_found", message: "That game doesn't exist." };
  const result = await leaveGame(userId, gameId);
  refresh(gameId);
  return result;
}

export async function lockGameAction(gameId: string): Promise<LockResult> {
  const userId = await requireUserId();
  if (!id.safeParse(gameId).success) return { ok: false, error: "not_found", message: "That game doesn't exist." };
  const result = await lockGame(userId, gameId);
  refresh(gameId);
  return result;
}

export async function submitResultAction(gameId: string, scoreA: number, scoreB: number): Promise<ResultResult> {
  const userId = await requireUserId();
  if (!id.safeParse(gameId).success) return { ok: false, error: "not_found", message: "That game doesn't exist." };
  if (!score.safeParse(scoreA).success || !score.safeParse(scoreB).success) {
    return { ok: false, error: "invalid_score", message: "Scores must be whole numbers from 0 to 30." };
  }
  const result = await submitResult(userId, gameId, scoreA, scoreB);
  refresh(gameId);
  return result;
}

export type CreateGameState = { error?: string } | undefined;

const createGameSchema = z
  .object({
    title: z.string().trim().min(3, "Give the game a name (3+ characters).").max(60),
    fieldId: z.string().min(1, "Pick a field."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    durationMin: z.coerce.number().int().refine((n) => [60, 90, 120].includes(n), "Pick a length."),
    capacity: z.coerce.number().int().min(4, "At least 4 players.").max(22, "At most 22 players."),
    minRating: z.coerce.number().int().min(600).max(2000),
    maxRating: z.coerce.number().int().min(600).max(2000),
    access: z.enum(["open", "permit", "rented"]),
    note: z.string().trim().max(200, "Keep the note under 200 characters.").optional(),
  })
  .refine((v) => v.minRating < v.maxRating, { message: "The lowest rating has to be below the highest." });

// Organizer = the signed-in user. Times are entered in New York time.
export async function createGameAction(_: CreateGameState, form: FormData): Promise<CreateGameState> {
  const userId = await requireUserId();
  const parsed = createGameSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const [y, mo, d] = v.date.split("-").map(Number);
  const [h, mi] = v.time.split(":").map(Number);

  const result = await createGame(userId, {
    title: v.title,
    fieldId: v.fieldId,
    startsAt: nyWallTime(y, mo, d, h, mi),
    durationMin: v.durationMin,
    capacity: v.capacity,
    minRating: v.minRating,
    maxRating: v.maxRating,
    access: v.access,
    note: v.note ? v.note : null,
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/", "layout");
  redirect(`/games/${result.gameId}`);
}
