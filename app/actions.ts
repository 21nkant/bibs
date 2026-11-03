"use server";

// Thin server actions: identity from the session, rules in the service layer.
// Both the Join button and the assistant's "Hold my spot" button call joinGameAction.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { joinGame, leaveGame, lockGame, submitResult } from "@/lib/service";
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
