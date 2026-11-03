// The assistant's view of a game, shared by the tools (server), the evals and the cards (client).
// Pure: no server or SDK imports, so the client bundle can use it.
import type { Borough, GameDetail, GameSummary } from "@/lib/types";
import { formatWhen } from "./time";

// What the model and the cards see for a game. Built from an explicit allowlist, so even if the data
// layer hands us a GameDetail (organizer note, roster names), none of it reaches the model.
export type AgentGame = {
  id: string;
  title: string;
  startsAt: string;
  when: string; // "Thu Nov 5 · 7 PM" (New York)
  durationMin: number;
  park: string;
  fieldNumber: string | null;
  borough: Borough;
  lit: boolean;
  surface: string | null;
  access: GameSummary["access"];
  status: GameSummary["status"];
  capacity: number;
  joinedCount: number;
  waitlistCount: number;
  spotsLeft: number;
  minRating: number;
  maxRating: number;
  viewerFits: boolean;
  viewerSpot: GameSummary["viewerSpot"];
  viewerWaitlistPosition: number | null;
};

// User-written text (titles): collapse whitespace/control characters and cap the length. It is still
// untrusted; the system prompt tells the model to treat it as data.
// Control characters plus the Unicode line/paragraph separators (U+2028/U+2029), built from char
// codes so no raw separator characters live in this source file.
const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]+`,
  "g",
);

export function cleanText(s: string, max = 80): string {
  const flat = s.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function toAgentGame(g: GameSummary): AgentGame {
  return {
    id: g.id,
    title: cleanText(g.title),
    startsAt: g.startsAt,
    when: formatWhen(g.startsAt),
    durationMin: g.durationMin,
    park: cleanText(g.field.park, 60),
    fieldNumber: g.field.fieldNumber,
    borough: g.field.borough,
    lit: g.field.lit,
    surface: g.field.surface,
    access: g.access,
    status: g.status,
    capacity: g.capacity,
    joinedCount: g.joinedCount,
    waitlistCount: g.waitlistCount,
    spotsLeft: g.spotsLeft,
    minRating: g.minRating,
    maxRating: g.maxRating,
    viewerFits: g.viewerFits,
    viewerSpot: g.viewerSpot,
    viewerWaitlistPosition: g.viewerWaitlistPosition,
  };
}

// Roster reduced to counts and a rating summary: no names, no user ids.
export function rosterSummary(d: GameDetail) {
  const joined = d.roster.filter((p) => p.status === "joined");
  const ratings = joined.map((p) => p.rating);
  return {
    joined: joined.length,
    waitlist: d.roster.length - joined.length,
    goalkeepers: joined.filter((p) => p.position === "gk").length,
    avgRating: ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
    lowestRating: ratings.length ? Math.min(...ratings) : null,
    highestRating: ratings.length ? Math.max(...ratings) : null,
  };
}

// Whether the viewer could hold a spot right now (the server re-checks everything on join).
export function holdEligibility(g: AgentGame, now: Date): { canHold: boolean; joinsWaitlist: boolean; reason: string | null } {
  const no = (reason: string) => ({ canHold: false, joinsWaitlist: false, reason });
  if (g.status !== "open") return no("This game isn't open for sign-ups.");
  if (new Date(g.startsAt).getTime() <= now.getTime()) return no("This game has already started.");
  if (g.viewerSpot === "joined") return no("You're already playing in this game.");
  if (g.viewerSpot === "waitlist") return no(`You're already on the waitlist (#${g.viewerWaitlistPosition ?? "?"}).`);
  if (!g.viewerFits) return no(`Your rating is outside this game's range (${g.minRating}–${g.maxRating}).`);
  return { canHold: true, joinsWaitlist: g.spotsLeft === 0, reason: null };
}
