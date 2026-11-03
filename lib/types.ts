// Shared contract between the UI, the service layer and the AI assistant.
// Change it only on purpose: all three sides depend on these shapes.

export type Position = "gk" | "outfield";
export type Level = "beginner" | "intermediate" | "advanced";
export type FieldAccess = "open" | "permit" | "rented";
export type GameStatus = "open" | "locked" | "played" | "cancelled";
export type Borough = "Brooklyn" | "Manhattan" | "Queens" | "Bronx" | "Staten Island";

export const BOROUGHS: Borough[] = ["Brooklyn", "Manhattan", "Queens", "Bronx", "Staten Island"];
export const STARTING_RATING: Record<Level, number> = {
  beginner: 1000,
  intermediate: 1200,
  advanced: 1400,
};
export const TIME_ZONE = "America/New_York";

export type Profile = {
  id: string;
  name: string;
  position: Position;
  level: Level;
  rating: number;
  gamesPlayed: number;
  lateDrops: number; // joined spots dropped within 24h of kickoff
  reliability: number | null; // gamesPlayed / (gamesPlayed + lateDrops); null with no history
};

export type Field = {
  id: string;
  park: string;
  fieldNumber: string | null;
  borough: Borough;
  lit: boolean;
  surface: string | null;
  regulation: boolean;
  lat: number;
  lng: number;
};

// What a list row / assistant card needs. Never includes the organizer's free-text note.
export type GameSummary = {
  id: string;
  title: string;
  startsAt: string; // ISO
  durationMin: number;
  field: Pick<Field, "id" | "park" | "fieldNumber" | "borough" | "lit" | "surface">;
  access: FieldAccess;
  status: GameStatus;
  capacity: number;
  joinedCount: number;
  waitlistCount: number;
  spotsLeft: number; // max(0, capacity - joinedCount)
  minRating: number;
  maxRating: number;
  // Viewer-relative
  viewerFits: boolean; // viewer's rating is inside [minRating, maxRating]
  viewerSpot: "joined" | "waitlist" | null;
  viewerWaitlistPosition: number | null; // 1-based
  // Title of another game the viewer is JOINED in that overlaps this one (they couldn't join this one).
  viewerClash: string | null;
};

export type RosterPlayer = {
  userId: string;
  name: string;
  position: Position;
  rating: number;
  reliability: number | null; // see Profile.reliability
  status: "joined" | "waitlist";
  team: "A" | "B" | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
};

export type GameDetail = GameSummary & {
  organizer: { id: string; name: string };
  viewerIsOrganizer: boolean;
  note: string | null; // shown in the UI only; the assistant tools strip it
  roster: RosterPlayer[]; // joined first (by joinedAt), then waitlist (by joinedAt)
  scoreA: number | null;
  scoreB: number | null;
  balancedWinProbA: number | null;
  naiveWinProbA: number | null;
};

export type GameFilters = {
  borough?: Borough;
  from?: string; // ISO; default now
  to?: string; // ISO; default now + 14 days
  litOnly?: boolean;
  fitsMyLevel?: boolean; // default true
  hasSpots?: boolean; // only games with an open spot
  limit?: number; // default 20, max 50
};

// Every write returns a result instead of throwing, so the UI and the assistant can explain *why*.
export type JoinError =
  | "not_found"
  | "not_open" // locked / played / cancelled
  | "already_in"
  | "out_of_range" // rating outside the game's range
  | "overlap" // already in another game at the same time
  | "started";
export type JoinResult =
  | { ok: true; status: "joined" }
  | { ok: true; status: "waitlist"; position: number }
  | { ok: false; error: JoinError; message: string };

export type LeaveResult =
  | { ok: true; promoted: { userId: string; name: string } | null; lateDrop: boolean }
  | { ok: false; error: "not_found" | "not_in_game" | "locked"; message: string };

export type LockResult =
  | { ok: true; balancedWinProbA: number; naiveWinProbA: number }
  | { ok: false; error: "not_found" | "not_organizer" | "not_open" | "not_enough_players"; message: string };

export type RatingChange = { userId: string; name: string; before: number; after: number; team: "A" | "B" };
export type ResultResult =
  | { ok: true; changes: RatingChange[] }
  | {
      ok: false;
      error: "not_found" | "not_organizer" | "not_locked" | "already_recorded" | "invalid_score";
      message: string;
    };

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  position: Position;
  level: Level;
};
