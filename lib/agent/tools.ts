// The assistant's tools. All read-only: the model can look things up and *propose* a booking, but
// the only write path is the human tapping "Hold my spot", which calls joinGameAction (the same code
// path as the Join button). The viewer's id is closed over from the verified session and is never a
// tool parameter, so the model cannot act as anyone else.
import { tool } from "ai";
import { z } from "zod";
import { BOROUGHS, type Borough, type GameDetail, type GameFilters, type GameSummary } from "@/lib/types";
import { holdEligibility, rosterSummary, toAgentGame } from "./game";
import { parseNyTime, toNyIso } from "./time";

export type { AgentGame } from "./game";

// Injectable data source: the real service in the route, fixtures in the evals.
export type AgentData = {
  searchGames(viewerId: string, filters: GameFilters): Promise<GameSummary[]>;
  getGame(viewerId: string, gameId: string): Promise<GameDetail | null>;
  getMyGames(userId: string): Promise<GameSummary[]>;
};

export const SEARCH_LIMIT = 8;
const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Data-layer failures are logged server-side and surfaced to the model as a generic message,
// so internals (SQL errors, hostnames) never reach the model or the client.
async function safely<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[assistant] ${label} failed`, err);
    throw new Error(`${label} is unavailable right now. Tell the player to try again in a moment.`);
  }
}

const gameIdInput = z.object({
  gameId: z.string().describe("The game's id, exactly as returned by search_games or get_my_games."),
});

export function makeTools({ userId, data, now }: { userId: string; data: AgentData; now: Date }) {
  async function loadGame(gameId: string): Promise<GameDetail> {
    if (!UUID.test(gameId.trim())) throw new Error("No game with that id. Use an id returned by search_games.");
    const game = await safely("Game lookup", () => data.getGame(userId, gameId.trim()));
    if (!game) throw new Error("No game with that id. Use an id returned by search_games.");
    return game;
  }

  return {
    search_games: tool({
      description:
        "Search upcoming pickup games for the signed-in player. Returns at most 8 games, soonest first. " +
        "Resolve relative dates yourself and pass from/to as ISO 8601 with the New York offset.",
      inputSchema: z.object({
        borough: z.enum(BOROUGHS as [Borough, ...Borough[]]).optional().describe("NYC borough. Omit to search all five."),
        from: z.string().optional().describe("Earliest start time, e.g. 2026-11-05T17:00:00-05:00. Default: now."),
        to: z.string().optional().describe("Latest start time, e.g. 2026-11-05T23:00:00-05:00. Default: 7 days from now."),
        litOnly: z.boolean().optional().describe("Only fields with floodlights (\"under lights\")."),
        hasSpots: z.boolean().optional().describe("Only games with an open spot (exclude full games)."),
        fitsMyLevel: z
          .boolean()
          .optional()
          .describe("Only games whose rating range includes the player's rating. Default true; set false only if asked."),
      }),
      execute: async (input) => {
        let from = now;
        if (input.from) {
          const parsed = parseNyTime(input.from);
          if (!parsed) throw new Error(`Couldn't read from="${input.from}". Use ISO 8601 like 2026-11-05T17:00:00-05:00.`);
          from = parsed.getTime() < now.getTime() ? now : parsed; // never search the past
        }
        let to = new Date(now.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS);
        if (input.to) {
          const parsed = parseNyTime(input.to);
          if (!parsed) throw new Error(`Couldn't read to="${input.to}". Use ISO 8601 like 2026-11-05T23:00:00-05:00.`);
          to = parsed;
        }
        const horizon = new Date(now.getTime() + MAX_WINDOW_DAYS * DAY_MS);
        if (to.getTime() > horizon.getTime()) to = horizon;
        if (to.getTime() <= from.getTime()) {
          throw new Error("That time window is empty or already in the past. Pick a window after the current time.");
        }

        const applied = {
          borough: input.borough ?? null,
          from: toNyIso(from),
          to: toNyIso(to),
          litOnly: input.litOnly ?? false,
          hasSpots: input.hasSpots ?? false,
          fitsMyLevel: input.fitsMyLevel ?? true,
        };
        const games = await safely("Game search", () =>
          data.searchGames(userId, {
            borough: input.borough,
            from: from.toISOString(),
            to: to.toISOString(),
            litOnly: applied.litOnly || undefined,
            hasSpots: applied.hasSpots || undefined,
            fitsMyLevel: applied.fitsMyLevel,
            limit: SEARCH_LIMIT,
          }),
        );
        return { applied, count: games.length, games: games.slice(0, SEARCH_LIMIT).map(toAgentGame) };
      },
    }),

    get_game: tool({
      description:
        "Details for one game: time, field, spots, rating range, and a roster summary (counts and ratings only).",
      inputSchema: gameIdInput,
      execute: async ({ gameId }) => {
        const detail = await loadGame(gameId);
        return {
          game: toAgentGame(detail),
          roster: rosterSummary(detail),
          teamsBalanced: detail.status === "locked" && detail.balancedWinProbA !== null,
        };
      },
    }),

    get_my_games: tool({
      description: "The signed-in player's upcoming games (joined or waitlisted), soonest first.",
      inputSchema: z.object({}),
      execute: async () => {
        const games = await safely("Your schedule", () => data.getMyGames(userId));
        return { count: games.length, games: games.map(toAgentGame) };
      },
    }),

    propose_booking: tool({
      description:
        "Show the player a booking card for one game with a \"Hold my spot\" button. This does NOT book anything: " +
        "the player taps the button to join. Use it whenever the player wants to join, book or grab a spot.",
      inputSchema: gameIdInput,
      execute: async ({ gameId }) => {
        const game = toAgentGame(await loadGame(gameId));
        return { game, ...holdEligibility(game, now) };
      },
    }),
  };
}

export type BibsTools = ReturnType<typeof makeTools>;
