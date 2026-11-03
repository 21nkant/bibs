// The service layer: the ONLY code that reads/writes games and enforces the rules.
// UI server actions (app/actions.ts) and the AI assistant's tools both call these functions.
// `userId` always comes from the verified session (lib/auth.ts), never from client or model input.
//
// Owner: logic agent. Signatures are a contract; implementations replace the TODOs.
import type {
  GameDetail,
  GameFilters,
  GameSummary,
  JoinResult,
  LeaveResult,
  LockResult,
  Profile,
  ResultResult,
} from "@/lib/types";

const todo = (name: string): never => {
  throw new Error(`${name}: not implemented yet`);
};

// ---- Reads -------------------------------------------------------------------------------
export async function getProfile(userId: string): Promise<Profile | null> {
  return todo(`getProfile(${userId})`);
}

export async function searchGames(viewerId: string, filters: GameFilters = {}): Promise<GameSummary[]> {
  return todo(`searchGames(${viewerId}, ${JSON.stringify(filters)})`);
}

export async function getGame(viewerId: string, gameId: string): Promise<GameDetail | null> {
  return todo(`getGame(${viewerId}, ${gameId})`);
}

// Upcoming games the user is joined to or waitlisted for, soonest first.
export async function getMyGames(userId: string): Promise<GameSummary[]> {
  return todo(`getMyGames(${userId})`);
}

// Played games for the rating history, newest first.
export async function getRatingHistory(
  userId: string,
): Promise<{ gameId: string; title: string; startsAt: string; before: number; after: number; won: boolean | null }[]> {
  return todo(`getRatingHistory(${userId})`);
}

// ---- Writes (each in one DB transaction, with the game row locked FOR UPDATE) -------------
export async function joinGame(userId: string, gameId: string): Promise<JoinResult> {
  return todo(`joinGame(${userId}, ${gameId})`);
}

export async function leaveGame(userId: string, gameId: string): Promise<LeaveResult> {
  return todo(`leaveGame(${userId}, ${gameId})`);
}

export async function lockGame(userId: string, gameId: string): Promise<LockResult> {
  return todo(`lockGame(${userId}, ${gameId})`);
}

export async function submitResult(
  userId: string,
  gameId: string,
  scoreA: number,
  scoreB: number,
): Promise<ResultResult> {
  return todo(`submitResult(${userId}, ${gameId}, ${scoreA}, ${scoreB})`);
}
