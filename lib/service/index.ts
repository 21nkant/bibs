// The service layer: the ONLY code that reads/writes games and enforces the rules.
// UI server actions (app/actions.ts) and the AI assistant's tools both call these functions.
// `userId` always comes from the verified session (lib/auth.ts), never from client or model input.
//
// Owner: logic agent. Signatures are a contract; implementations replace the TODOs.
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, ne, sql, type SQL } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import { balanceTeams, naiveSplit } from "@/lib/engine/balance";
import { rateGame } from "@/lib/engine/elo";
import { isLateDrop, reliability } from "@/lib/engine/reliability";
import {
  TIME_ZONE,
  type Borough,
  type GameDetail,
  type GameFilters,
  type GameStatus,
  type GameSummary,
  type JoinError,
  type JoinResult,
  type LeaveResult,
  type LockResult,
  type Profile,
  type ResultResult,
  type RosterPlayer,
} from "@/lib/types";

const { games, fields, gamePlayers: gp, profiles } = schema;

const DAY_MS = 86_400_000;
const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
// Used when there is no viewer profile, so viewer-relative joins simply match nothing.
const NO_VIEWER = "00000000-0000-0000-0000-000000000000";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids can come from URLs or the assistant; a malformed one is "not found", not a DB error. */
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);

// End of a game's time window, in SQL.
const gameEnd = sql`(${games.startsAt} + ${games.durationMin} * interval '1 minute')`;
// Dates are passed to raw SQL as ISO strings (the drizzle postgres-js driver doesn't serialize Date in sql``).
const ts = (d: Date) => sql`${d.toISOString()}::timestamptz`;
// "Upcoming" = not finished yet (in-progress games still count) and still open or locked.
const upcoming = (now: Date) => and(sql`${gameEnd} > ${ts(now)}`, inArray(games.status, ["open", "locked"]));

// ---- Reads -------------------------------------------------------------------------------
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isUuid(userId)) return null;
  const [row] = await db
    .select({
      id: profiles.id,
      name: profiles.name,
      position: profiles.position,
      level: profiles.level,
      rating: profiles.rating,
      gamesPlayed: profiles.gamesPlayed,
      lateDrops: profiles.lateDrops,
    })
    .from(profiles)
    .where(eq(profiles.id, userId));
  return row ? { ...row, reliability: reliability(row.gamesPlayed, row.lateDrops) } : null;
}

// Per-game spot counts, one aggregate over game_players.
function countsSubquery() {
  return db
    .select({
      gameId: gp.gameId,
      joinedCount: sql<number>`(count(*) filter (where ${gp.status} = 'joined'))::int`.as("joined_count"),
      waitlistCount: sql<number>`(count(*) filter (where ${gp.status} = 'waitlist'))::int`.as("waitlist_count"),
    })
    .from(gp)
    .groupBy(gp.gameId)
    .as("counts");
}

// Every spot with its 1-based position inside its status (waitlist position = sign-up order).
function spotsSubquery() {
  return db
    .select({
      gameId: gp.gameId,
      userId: gp.userId,
      status: gp.status,
      position:
        sql<number>`(row_number() over (partition by ${gp.gameId}, ${gp.status} order by ${gp.joinedAt}, ${gp.userId}))::int`.as(
          "position",
        ),
    })
    .from(gp)
    .as("spots");
}

type Counts = ReturnType<typeof countsSubquery>;

/**
 * The one query behind every GameSummary: games + field + spot counts + the viewer's own spot.
 * Never selects games.note (the assistant consumes summaries; notes are a prompt-injection surface).
 */
async function querySummaries(
  viewer: Profile | null,
  where: (c: Counts) => SQL | undefined,
  limit?: number,
): Promise<GameSummary[]> {
  const counts = countsSubquery();
  const spots = spotsSubquery();
  const query = db
    .select({
      id: games.id,
      title: games.title,
      startsAt: games.startsAt,
      durationMin: games.durationMin,
      fieldId: fields.id,
      park: fields.park,
      fieldNumber: fields.fieldNumber,
      borough: fields.borough,
      lit: fields.lit,
      surface: fields.surface,
      access: games.access,
      status: games.status,
      capacity: games.capacity,
      minRating: games.minRating,
      maxRating: games.maxRating,
      joinedCount: sql<number>`coalesce(${counts.joinedCount}, 0)`.mapWith(Number),
      waitlistCount: sql<number>`coalesce(${counts.waitlistCount}, 0)`.mapWith(Number),
      viewerStatus: spots.status,
      viewerPosition: spots.position,
      // Same overlap rule as joinGame: a joined spot in another open/locked game at the same time.
      viewerClash: sql<string | null>`(
        select g2.title from game_players gp2 join games g2 on g2.id = gp2.game_id
        where gp2.user_id = ${viewer?.id ?? NO_VIEWER} and gp2.status = 'joined'
          and g2.status in ('open', 'locked') and g2.id <> ${games.id}
          and g2.starts_at < ${gameEnd}
          and g2.starts_at + g2.duration_min * interval '1 minute' > ${games.startsAt}
        order by g2.starts_at limit 1)`,
    })
    .from(games)
    .innerJoin(fields, eq(fields.id, games.fieldId))
    .leftJoin(counts, eq(counts.gameId, games.id))
    .leftJoin(spots, and(eq(spots.gameId, games.id), eq(spots.userId, viewer?.id ?? NO_VIEWER)))
    .where(where(counts))
    .orderBy(asc(games.startsAt), asc(games.id))
    .$dynamic();
  const rows = await (limit ? query.limit(limit) : query);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    startsAt: r.startsAt.toISOString(),
    durationMin: r.durationMin,
    field: {
      id: r.fieldId,
      park: r.park,
      fieldNumber: r.fieldNumber,
      borough: r.borough as Borough,
      lit: r.lit,
      surface: r.surface,
    },
    access: r.access,
    status: r.status,
    capacity: r.capacity,
    joinedCount: r.joinedCount,
    waitlistCount: r.waitlistCount,
    spotsLeft: Math.max(0, r.capacity - r.joinedCount),
    minRating: r.minRating,
    maxRating: r.maxRating,
    viewerFits: viewer !== null && viewer.rating >= r.minRating && viewer.rating <= r.maxRating,
    viewerSpot: r.viewerStatus ?? null,
    viewerWaitlistPosition: r.viewerStatus === "waitlist" ? (r.viewerPosition ?? null) : null,
    viewerClash: r.viewerStatus === "joined" ? null : (r.viewerClash ?? null),
  }));
}

function parseDate(iso: string | undefined, fallback: Date): Date {
  if (!iso) return fallback;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function searchGames(viewerId: string, filters: GameFilters = {}): Promise<GameSummary[]> {
  const viewer = await getProfile(viewerId);
  const now = new Date();
  const to = parseDate(filters.to, new Date(now.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(filters.limit ?? DEFAULT_LIMIT)));
  const fitsMyLevel = filters.fitsMyLevel ?? true;

  return querySummaries(
    viewer,
    (counts) =>
      and(
        upcoming(now),
        // An explicit `from` means "starting at or after"; by default, anything not finished yet.
        filters.from ? gte(games.startsAt, parseDate(filters.from, now)) : undefined,
        lte(games.startsAt, to),
        filters.borough ? eq(fields.borough, filters.borough) : undefined,
        filters.litOnly ? eq(fields.lit, true) : undefined,
        fitsMyLevel && viewer
          ? and(lte(games.minRating, viewer.rating), gte(games.maxRating, viewer.rating))
          : undefined,
        filters.hasSpots
          ? and(eq(games.status, "open"), sql`coalesce(${counts.joinedCount}, 0) < ${games.capacity}`)
          : undefined,
      ),
    limit,
  );
}

export async function getGame(viewerId: string, gameId: string): Promise<GameDetail | null> {
  if (!isUuid(gameId)) return null;
  const viewer = await getProfile(viewerId);
  const [[summary], [extra], roster] = await Promise.all([
    querySummaries(viewer, () => eq(games.id, gameId)),
    db
      .select({
        organizerId: games.organizerId,
        organizerName: profiles.name,
        note: games.note,
        scoreA: games.scoreA,
        scoreB: games.scoreB,
        balancedWinProbA: games.balancedWinProbA,
        naiveWinProbA: games.naiveWinProbA,
      })
      .from(games)
      .innerJoin(profiles, eq(profiles.id, games.organizerId))
      .where(eq(games.id, gameId)),
    getRoster(gameId),
  ]);
  if (!summary || !extra) return null;
  return {
    ...summary,
    organizer: { id: extra.organizerId, name: extra.organizerName },
    viewerIsOrganizer: viewer !== null && viewer.id === extra.organizerId,
    note: extra.note,
    roster,
    scoreA: extra.scoreA,
    scoreB: extra.scoreB,
    balancedWinProbA: extra.balancedWinProbA,
    naiveWinProbA: extra.naiveWinProbA,
  };
}

// Joined first (sign-up order), then the waitlist (sign-up order).
async function getRoster(gameId: string): Promise<RosterPlayer[]> {
  const rows = await db
    .select({
      userId: gp.userId,
      name: profiles.name,
      position: profiles.position,
      rating: profiles.rating,
      gamesPlayed: profiles.gamesPlayed,
      lateDrops: profiles.lateDrops,
      status: gp.status,
      team: gp.team,
      ratingBefore: gp.ratingBefore,
      ratingAfter: gp.ratingAfter,
    })
    .from(gp)
    .innerJoin(profiles, eq(profiles.id, gp.userId))
    .where(eq(gp.gameId, gameId))
    .orderBy(sql`case when ${gp.status} = 'joined' then 0 else 1 end`, asc(gp.joinedAt), asc(gp.userId));
  return rows.map(({ gamesPlayed, lateDrops, ...p }) => ({ ...p, reliability: reliability(gamesPlayed, lateDrops) }));
}

// Upcoming games the user is joined to or waitlisted for, soonest first.
export async function getMyGames(userId: string): Promise<GameSummary[]> {
  const viewer = await getProfile(userId);
  if (!viewer) return [];
  const now = new Date();
  return querySummaries(viewer, () =>
    and(
      upcoming(now),
      sql`exists (select 1 from ${gp} where ${gp.gameId} = ${games.id} and ${gp.userId} = ${viewer.id})`,
    ),
  );
}

// Played games for the rating history, newest first.
export async function getRatingHistory(
  userId: string,
): Promise<{ gameId: string; title: string; startsAt: string; before: number; after: number; won: boolean | null }[]> {
  if (!isUuid(userId)) return [];
  const rows = await db
    .select({
      gameId: games.id,
      title: games.title,
      startsAt: games.startsAt,
      before: gp.ratingBefore,
      after: gp.ratingAfter,
      team: gp.team,
      scoreA: games.scoreA,
      scoreB: games.scoreB,
    })
    .from(gp)
    .innerJoin(games, eq(games.id, gp.gameId))
    .where(
      and(eq(gp.userId, userId), eq(games.status, "played"), isNotNull(gp.ratingBefore), isNotNull(gp.ratingAfter)),
    )
    .orderBy(desc(games.startsAt), desc(games.id));

  return rows.map((r) => ({
    gameId: r.gameId,
    title: r.title,
    startsAt: r.startsAt.toISOString(),
    before: r.before!,
    after: r.after!,
    won:
      r.team === null || r.scoreA === null || r.scoreB === null || r.scoreA === r.scoreB
        ? null
        : (r.team === "A") === r.scoreA > r.scoreB,
  }));
}

// ---- Writes (each in one DB transaction, with the game row locked FOR UPDATE) -------------
// Locking the game row serializes every write to that game: two people racing for the last spot
// run one after the other, and the second sees the first's committed row (READ COMMITTED takes a
// fresh snapshot per statement). Profile rows are locked after the game row, never before.

const NOT_FOUND = "That game doesn't exist.";
const MIN_PLAYERS_TO_LOCK = 4;
const MAX_SCORE = 30;

// "Tue, Nov 4, 7:00 PM" in New York time.
const whenFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function lockGameRow(tx: Tx, gameId: string) {
  return tx.select().from(games).where(eq(games.id, gameId)).for("update");
}

function closedMessage(status: GameStatus): string {
  switch (status) {
    case "locked":
      return "Teams are already locked for this game, so the roster is closed.";
    case "played":
      return "This game has already been played.";
    case "cancelled":
      return "This game was cancelled.";
    default:
      return "This game isn't open for sign-ups.";
  }
}

export async function joinGame(userId: string, gameId: string): Promise<JoinResult> {
  const fail = (error: JoinError, message: string): JoinResult => ({ ok: false, error, message });
  if (!isUuid(gameId) || !isUuid(userId)) return fail("not_found", NOT_FOUND);

  return db.transaction(async (tx) => {
    const [game] = await lockGameRow(tx, gameId);
    if (!game) return fail("not_found", NOT_FOUND);
    if (game.status !== "open") return fail("not_open", closedMessage(game.status));
    if (game.startsAt.getTime() <= Date.now()) return fail("started", "This game has already started.");

    const [existing] = await tx
      .select({ status: gp.status })
      .from(gp)
      .where(and(eq(gp.gameId, gameId), eq(gp.userId, userId)));
    if (existing) {
      if (existing.status === "joined") return fail("already_in", "You're already in this game.");
      // Position among the waitlist by sign-up order (compared in SQL to keep microsecond precision).
      const [{ position }] = await tx
        .select({ position: sql<number>`count(*)::int` })
        .from(gp)
        .where(
          and(
            eq(gp.gameId, gameId),
            eq(gp.status, "waitlist"),
            sql`(${gp.joinedAt}, ${gp.userId}) <= (select w.joined_at, w.user_id from game_players w where w.game_id = ${gameId}::uuid and w.user_id = ${userId}::uuid)`,
          ),
        );
      return fail("already_in", `You're already on the waitlist for this game (#${position}).`);
    }

    // Locking the player's profile serializes their own joins, so two overlapping games can't both slip in.
    const [me] = await tx
      .select({ rating: profiles.rating })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .for("update");
    if (!me) return fail("not_found", "We couldn't find your player profile. Finish signing up first.");
    if (me.rating < game.minRating || me.rating > game.maxRating) {
      return fail(
        "out_of_range",
        `This game is for ratings ${game.minRating}–${game.maxRating}. You're at ${me.rating}.`,
      );
    }

    const clash = await findClash(tx, userId, { id: gameId, startsAt: game.startsAt, durationMin: game.durationMin });
    if (clash) {
      return fail(
        "overlap",
        `You're already playing in "${clash.title}" (${whenFmt.format(clash.startsAt)}), which overlaps with this game.`,
      );
    }

    const [{ joined, waitlist }] = await tx
      .select({
        joined: sql<number>`(count(*) filter (where ${gp.status} = 'joined'))::int`,
        waitlist: sql<number>`(count(*) filter (where ${gp.status} = 'waitlist'))::int`,
      })
      .from(gp)
      .where(eq(gp.gameId, gameId));

    const status = joined < game.capacity ? "joined" : "waitlist";
    // clock_timestamp(), not now(): now() is the transaction start, which can predate a row
    // committed by a transaction that won the lock first, and sign-up order must match lock order.
    await tx.insert(gp).values({ gameId, userId, status, joinedAt: sql`clock_timestamp()` });
    return status === "joined" ? { ok: true, status: "joined" } : { ok: true, status: "waitlist", position: waitlist + 1 };
  });
}

// The player's JOINED (not waitlisted) spot in another open/locked game whose time window overlaps
// this one, if any. Used by joinGame and by waitlist promotion, so both enforce the same rule.
async function findClash(tx: Tx, userId: string, game: { id: string; startsAt: Date; durationMin: number }) {
  const thisEnd = new Date(game.startsAt.getTime() + game.durationMin * 60_000);
  const [clash] = await tx
    .select({ title: games.title, startsAt: games.startsAt })
    .from(gp)
    .innerJoin(games, eq(games.id, gp.gameId))
    .where(
      and(
        eq(gp.userId, userId),
        eq(gp.status, "joined"),
        inArray(games.status, ["open", "locked"]),
        ne(games.id, game.id),
        sql`${games.startsAt} < ${ts(thisEnd)}`,
        sql`${gameEnd} > ${ts(game.startsAt)}`,
      ),
    )
    .orderBy(asc(games.startsAt))
    .limit(1);
  return clash ?? null;
}

export async function leaveGame(userId: string, gameId: string): Promise<LeaveResult> {
  type LeaveError = Extract<LeaveResult, { ok: false }>["error"];
  const fail = (error: LeaveError, message: string): LeaveResult => ({ ok: false, error, message });
  if (!isUuid(gameId) || !isUuid(userId)) return fail("not_found", NOT_FOUND);

  return db.transaction(async (tx) => {
    const [game] = await lockGameRow(tx, gameId);
    if (!game) return fail("not_found", NOT_FOUND);
    if (game.status === "locked" || game.status === "played") {
      return fail(
        "locked",
        game.status === "played"
          ? "This game has already been played, so you can't leave it."
          : "Teams are already locked, so you can't drop out here. Let the organizer know you can't make it.",
      );
    }

    const [spot] = await tx
      .delete(gp)
      .where(and(eq(gp.gameId, gameId), eq(gp.userId, userId)))
      .returning({ status: gp.status });
    if (!spot) return fail("not_in_game", "You're not signed up for this game.");
    if (spot.status !== "joined") return { ok: true, promoted: null, lateDrop: false };

    // Dropping a joined spot inside 24h of kickoff counts against reliability (same transaction).
    const lateDrop = isLateDrop(game.startsAt, new Date());
    if (lateDrop) {
      await tx.update(profiles).set({ lateDrops: sql`${profiles.lateDrops} + 1` }).where(eq(profiles.id, userId));
    }

    // A joined spot opened up: the earliest waitlisted player takes it, if the game has room.
    const [{ joined }] = await tx
      .select({ joined: sql<number>`count(*)::int` })
      .from(gp)
      .where(and(eq(gp.gameId, gameId), eq(gp.status, "joined")));
    if (joined >= game.capacity) return { ok: true, promoted: null, lateDrop };

    // Promotion re-checks the join rules: the first waitlisted player who still fits the rating range
    // and isn't now playing another game at the same time. Anyone skipped keeps their waitlist place.
    const waitlist = await tx
      .select({ userId: gp.userId, name: profiles.name, rating: profiles.rating })
      .from(gp)
      .innerJoin(profiles, eq(profiles.id, gp.userId))
      .where(and(eq(gp.gameId, gameId), eq(gp.status, "waitlist")))
      .orderBy(asc(gp.joinedAt), asc(gp.userId));
    let next: { userId: string; name: string } | null = null;
    for (const w of waitlist) {
      if (w.rating < game.minRating || w.rating > game.maxRating) continue;
      if (await findClash(tx, w.userId, { id: gameId, startsAt: game.startsAt, durationMin: game.durationMin })) continue;
      next = w;
      break;
    }
    if (!next) return { ok: true, promoted: null, lateDrop };

    await tx
      .update(gp)
      .set({ status: "joined" })
      .where(and(eq(gp.gameId, gameId), eq(gp.userId, next.userId)));
    return { ok: true, promoted: { userId: next.userId, name: next.name }, lateDrop };
  });
}

export async function lockGame(userId: string, gameId: string): Promise<LockResult> {
  type LockError = Extract<LockResult, { ok: false }>["error"];
  const fail = (error: LockError, message: string): LockResult => ({ ok: false, error, message });
  if (!isUuid(gameId) || !isUuid(userId)) return fail("not_found", NOT_FOUND);

  return db.transaction(async (tx) => {
    const [game] = await lockGameRow(tx, gameId);
    if (!game) return fail("not_found", NOT_FOUND);
    if (game.organizerId !== userId) return fail("not_organizer", "Only the organizer can lock the teams.");
    if (game.status !== "open") {
      return fail(
        "not_open",
        game.status === "locked" ? "Teams are already locked for this game." : closedMessage(game.status),
      );
    }

    // Joined players in sign-up order (the naive split uses this order).
    const players = await tx
      .select({ id: gp.userId, rating: profiles.rating, position: profiles.position })
      .from(gp)
      .innerJoin(profiles, eq(profiles.id, gp.userId))
      .where(and(eq(gp.gameId, gameId), eq(gp.status, "joined")))
      .orderBy(asc(gp.joinedAt), asc(gp.userId));
    if (players.length < MIN_PLAYERS_TO_LOCK) {
      return fail(
        "not_enough_players",
        `You need at least ${MIN_PLAYERS_TO_LOCK} players to lock teams. ${
          players.length === 1 ? "There's 1" : `There are ${players.length}`
        } so far.`,
      );
    }

    const balanced = balanceTeams(players);
    const naive = naiveSplit(players);

    await tx.update(gp).set({ team: "A" }).where(and(eq(gp.gameId, gameId), inArray(gp.userId, balanced.teamA)));
    await tx.update(gp).set({ team: "B" }).where(and(eq(gp.gameId, gameId), inArray(gp.userId, balanced.teamB)));
    await tx
      .update(games)
      .set({ status: "locked", balancedWinProbA: balanced.winProbA, naiveWinProbA: naive.winProbA })
      .where(eq(games.id, gameId));

    return { ok: true, balancedWinProbA: balanced.winProbA, naiveWinProbA: naive.winProbA };
  });
}

export async function submitResult(
  userId: string,
  gameId: string,
  scoreA: number,
  scoreB: number,
): Promise<ResultResult> {
  type ResultError = Extract<ResultResult, { ok: false }>["error"];
  const fail = (error: ResultError, message: string): ResultResult => ({ ok: false, error, message });
  if (!isUuid(gameId) || !isUuid(userId)) return fail("not_found", NOT_FOUND);

  return db.transaction(async (tx) => {
    const [game] = await lockGameRow(tx, gameId);
    if (!game) return fail("not_found", NOT_FOUND);
    if (game.organizerId !== userId) return fail("not_organizer", "Only the organizer can record the score.");
    // Checked under the row lock, so a double submit always sees the first one's "played".
    if (game.status === "played") {
      return fail("already_recorded", `The score for this game is already recorded (${game.scoreA}–${game.scoreB}).`);
    }
    if (game.status !== "locked") return fail("not_locked", "Lock the teams before recording a score.");
    const valid = (s: number) => Number.isInteger(s) && s >= 0 && s <= MAX_SCORE;
    if (!valid(scoreA) || !valid(scoreB)) {
      return fail("invalid_score", `Scores must be whole numbers from 0 to ${MAX_SCORE}.`);
    }

    // Lock the players' profiles in id order (a consistent order, so concurrent results can't deadlock).
    const players = await tx
      .select({
        id: profiles.id,
        name: profiles.name,
        rating: profiles.rating,
        gamesPlayed: profiles.gamesPlayed,
        team: gp.team,
      })
      .from(gp)
      .innerJoin(profiles, eq(profiles.id, gp.userId))
      .where(and(eq(gp.gameId, gameId), eq(gp.status, "joined"), isNotNull(gp.team)))
      .orderBy(asc(profiles.id))
      .for("update", { of: profiles });

    const rated = players.filter((p): p is typeof p & { team: "A" | "B" } => p.team !== null);
    const hasBothTeams = rated.some((p) => p.team === "A") && rated.some((p) => p.team === "B");
    const changes = hasBothTeams ? rateGame(rated, scoreA, scoreB) : [];

    if (changes.length > 0) {
      const values = sql.join(
        changes.map((c) => sql`(${c.id}::uuid, ${c.before}::int, ${c.after}::int)`),
        sql`, `,
      );
      await tx.execute(sql`
        update ${profiles} set rating = v.after, games_played = ${profiles.gamesPlayed} + 1
        from (values ${values}) as v(id, before, after)
        where ${profiles.id} = v.id`);
      await tx.execute(sql`
        update ${gp} set rating_before = v.before, rating_after = v.after
        from (values ${values}) as v(id, before, after)
        where ${gp.gameId} = ${gameId}::uuid and ${gp.userId} = v.id`);
    }
    await tx.update(games).set({ scoreA, scoreB, status: "played" }).where(eq(games.id, gameId));

    const names = new Map(rated.map((p) => [p.id, p.name]));
    return {
      ok: true,
      changes: changes.map((c) => ({ userId: c.id, name: names.get(c.id)!, before: c.before, after: c.after, team: c.team })),
    };
  });
}
