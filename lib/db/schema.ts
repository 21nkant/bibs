import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const positionEnum = pgEnum("position", ["gk", "outfield"]);
export const levelEnum = pgEnum("level", ["beginner", "intermediate", "advanced"]);
export const accessEnum = pgEnum("field_access", ["open", "permit", "rented"]);
// "full" is derived from the roster count, never stored, so it can't drift.
export const gameStatusEnum = pgEnum("game_status", ["open", "locked", "played", "cancelled"]);
export const spotStatusEnum = pgEnum("spot_status", ["joined", "waitlist"]);
export const teamEnum = pgEnum("team", ["A", "B"]);

// One row per signed-up player. id = Supabase auth.users.id.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  position: positionEnum("position").notNull(),
  level: levelEnum("level").notNull(),
  rating: integer("rating").notNull(),
  gamesPlayed: integer("games_played").notNull().default(0),
  // Joined spots dropped within 24h of kickoff (see lib/engine/reliability.ts).
  lateDrops: integer("late_drops").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// NYC Parks soccer fields (NYC Open Data qnem-b8re, park names from enfh-gkve).
export const fields = pgTable("fields", {
  id: text("id").primaryKey(),
  park: text("park").notNull(),
  fieldNumber: text("field_number"),
  borough: text("borough").notNull(), // Brooklyn | Manhattan | Queens | Bronx | Staten Island
  lit: boolean("lit").notNull(),
  surface: text("surface"),
  regulation: boolean("regulation").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  fieldId: text("field_id").notNull().references(() => fields.id),
  organizerId: uuid("organizer_id").notNull().references(() => profiles.id),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull().default(90),
  capacity: integer("capacity").notNull().default(14),
  minRating: integer("min_rating").notNull(),
  maxRating: integer("max_rating").notNull(),
  access: accessEnum("access").notNull(),
  status: gameStatusEnum("status").notNull().default("open"),
  // Free text written by organizers. Never sent to the AI assistant (prompt-injection surface).
  note: text("note"),
  scoreA: integer("score_a"),
  scoreB: integer("score_b"),
  // Win probability for team A: the balanced split, and the naive sign-up-order split it replaced.
  balancedWinProbA: doublePrecision("balanced_win_prob_a"),
  naiveWinProbA: doublePrecision("naive_win_prob_a"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gamePlayers = pgTable(
  "game_players",
  {
    gameId: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id),
    status: spotStatusEnum("status").notNull(),
    team: teamEnum("team"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    ratingBefore: integer("rating_before"),
    ratingAfter: integer("rating_after"),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.userId] })],
);

// Per-user daily cap on assistant messages (protects the API credits).
export const agentUsage = pgTable(
  "agent_usage",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
