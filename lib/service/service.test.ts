// Integration tests against the real database. They create their own throwaway profiles and games
// (dated a month out, so they stay out of the app's default 14-day search) and delete them afterwards.
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "@/lib/db";
import {
  createGame,
  getGame,
  getMyGames,
  getProfile,
  getRatingHistory,
  joinGame,
  leaveGame,
  lockGame,
  searchGames,
  submitResult,
} from "./index";

const hasDb = Boolean(process.env.POSTGRES_URL);

describe.skipIf(!hasDb)("service (integration)", () => {
  const profileIds: string[] = [];
  const gameIds: string[] = [];
  const START = new Date(Date.now() + 30 * 86_400_000);
  START.setUTCMinutes(0, 0, 0);

  let fieldId: string;
  let org: string;
  let low: string;
  let players: string[]; // p1..p5
  let game: string;
  let overlapping: string;

  async function makeProfile(name: string, rating: number, gamesPlayed: number) {
    const id = randomUUID();
    await db.insert(schema.profiles).values({ id, name, position: "outfield", level: "intermediate", rating, gamesPlayed });
    profileIds.push(id);
    return id;
  }

  async function makeGame(title: string, startsAt: Date, capacity: number) {
    const [row] = await db
      .insert(schema.games)
      .values({
        fieldId,
        organizerId: org,
        title,
        startsAt,
        capacity,
        minRating: 1000,
        maxRating: 1400,
        access: "open",
        note: "test note",
      })
      .returning({ id: schema.games.id });
    gameIds.push(row.id);
    return row.id;
  }

  const ratingOf = async (id: string) =>
    (await db.select().from(schema.profiles).where(eq(schema.profiles.id, id)))[0];

  beforeAll(async () => {
    const [field] = await db.select({ id: schema.fields.id }).from(schema.fields).limit(1);
    fieldId = field.id;
    org = await makeProfile("Test Organizer", 1200, 10);
    low = await makeProfile("Test Low", 900, 10);
    players = [
      await makeProfile("Test P1", 1300, 10),
      await makeProfile("Test P2", 1100, 10),
      await makeProfile("Test P3", 1250, 2), // provisional
      await makeProfile("Test P4", 1150, 10),
      await makeProfile("Test P5", 1200, 10),
    ];
    game = await makeGame("[test] Capacity Four", START, 4);
    overlapping = await makeGame("[test] Overlapping", new Date(START.getTime() + 30 * 60_000), 14);
  });

  afterAll(async () => {
    try {
      if (gameIds.length) await db.delete(schema.games).where(inArray(schema.games.id, gameIds)); // cascades spots
      if (profileIds.length) {
        await db.delete(schema.gamePlayers).where(inArray(schema.gamePlayers.userId, profileIds));
        await db.delete(schema.profiles).where(inArray(schema.profiles.id, profileIds));
      }
    } finally {
      await db.$client.end();
    }
  });

  it("blocks players outside the rating range, with a clear message", async () => {
    const r = await joinGame(low, game);
    expect(r).toEqual({
      ok: false,
      error: "out_of_range",
      message: "This game is for ratings 1000–1400. You're at 900.",
    });
  });

  it("two simultaneous joins for the LAST spot: exactly one joined, one waitlisted", async () => {
    const [p1, p2, p3, p4, p5] = players;
    for (const p of [p1, p2, p3]) expect(await joinGame(p, game)).toEqual({ ok: true, status: "joined" });

    const results = await Promise.all([joinGame(p4, game), joinGame(p5, game)]);
    const statuses = results.map((r) => (r.ok ? r.status : r.error)).sort();
    expect(statuses).toEqual(["joined", "waitlist"]);
    expect(results.find((r) => r.ok && r.status === "waitlist")).toEqual({ ok: true, status: "waitlist", position: 1 });

    const spots = await db.select().from(schema.gamePlayers).where(eq(schema.gamePlayers.gameId, game));
    expect(spots.filter((s) => s.status === "joined")).toHaveLength(4);
    expect(spots.filter((s) => s.status === "waitlist")).toHaveLength(1);
  });

  it("rejects a second join by the same player", async () => {
    const r = await joinGame(players[0], game);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("already_in");
  });

  it("reads: counts, viewer spot, roster order, and no note in summaries", async () => {
    const waitlisted = (
      await db
        .select()
        .from(schema.gamePlayers)
        .where(and(eq(schema.gamePlayers.gameId, game), eq(schema.gamePlayers.status, "waitlist")))
    )[0].userId;

    const detail = await getGame(waitlisted, game);
    expect(detail).not.toBeNull();
    expect(detail!.joinedCount).toBe(4);
    expect(detail!.waitlistCount).toBe(1);
    expect(detail!.spotsLeft).toBe(0);
    expect(detail!.viewerSpot).toBe("waitlist");
    expect(detail!.viewerWaitlistPosition).toBe(1);
    expect(detail!.note).toBe("test note");
    expect(detail!.roster.map((p) => p.status)).toEqual(["joined", "joined", "joined", "joined", "waitlist"]);
    expect(detail!.roster.slice(0, 3).map((p) => p.userId)).toEqual(players.slice(0, 3));

    const mine = await getMyGames(waitlisted);
    const summary = mine.find((g) => g.id === game)!;
    expect(summary.viewerWaitlistPosition).toBe(1);
    expect("note" in summary).toBe(false);

    const found = await searchGames(players[0], { from: START.toISOString(), to: new Date(START.getTime() + 3_600_000).toISOString() });
    expect(found.map((g) => g.id)).toContain(game);
    expect(found.every((g) => !("note" in g))).toBe(true);
  });

  it("blocks joining a game that overlaps one you're already in", async () => {
    const r = await joinGame(players[1], overlapping);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("overlap");
  });

  it("leaving a joined spot promotes the first waitlisted player", async () => {
    const [{ userId: waitlisted }] = await db
      .select({ userId: schema.gamePlayers.userId })
      .from(schema.gamePlayers)
      .where(and(eq(schema.gamePlayers.gameId, game), eq(schema.gamePlayers.status, "waitlist")));

    const r = await leaveGame(players[0], game);
    expect(r).toEqual({ ok: true, promoted: { userId: waitlisted, name: expect.stringMatching(/^Test P/) }, lateDrop: false });

    const spots = await db.select().from(schema.gamePlayers).where(eq(schema.gamePlayers.gameId, game));
    expect(spots.filter((s) => s.status === "joined")).toHaveLength(4);
    expect(spots.filter((s) => s.status === "waitlist")).toHaveLength(0);
    expect(await leaveGame(players[0], game)).toMatchObject({ ok: false, error: "not_in_game" });
  });

  it("waitlist promotion skips a player who is now playing an overlapping game (found in live QA)", async () => {
    const later = new Date(START.getTime() + 5 * 86_400_000);
    const full = await makeGame("[test] One Spot", later, 1);
    const clashing = await makeGame("[test] Same Time", new Date(later.getTime() + 30 * 60_000), 14);
    const [x, y, z] = [await makeProfile("Test X", 1200, 10), await makeProfile("Test Y", 1200, 10), await makeProfile("Test Z", 1200, 10)];

    expect(await joinGame(x, full)).toEqual({ ok: true, status: "joined" });
    expect(await joinGame(y, full)).toEqual({ ok: true, status: "waitlist", position: 1 });
    expect(await joinGame(y, clashing)).toEqual({ ok: true, status: "joined" }); // allowed: Y is only waitlisted in `full`
    expect(await joinGame(z, full)).toEqual({ ok: true, status: "waitlist", position: 2 });

    const r = await leaveGame(x, full);
    expect(r).toEqual({ ok: true, promoted: { userId: z, name: "Test Z" }, lateDrop: false });
    const spots = await db.select().from(schema.gamePlayers).where(eq(schema.gamePlayers.gameId, full));
    expect(spots.find((s) => s.userId === y)?.status).toBe("waitlist"); // Y keeps their place
  });

  it("leaving a joined spot within 24h of kickoff is a late drop; leaving earlier isn't", async () => {
    const soon = await makeGame("[test] Kicks Off Soon", new Date(Date.now() + 5 * 3_600_000), 14);
    const farOff = await makeGame("[test] Next Month", new Date(START.getTime() + 10 * 86_400_000), 14);
    const flaky = await makeProfile("Test Flaky", 1200, 10);

    expect(await joinGame(flaky, farOff)).toEqual({ ok: true, status: "joined" });
    expect(await leaveGame(flaky, farOff)).toMatchObject({ ok: true, lateDrop: false });
    expect((await getProfile(flaky))!.lateDrops).toBe(0);

    expect(await joinGame(flaky, soon)).toEqual({ ok: true, status: "joined" });
    expect(await leaveGame(flaky, soon)).toMatchObject({ ok: true, lateDrop: true });
    const after = (await getProfile(flaky))!;
    expect(after.lateDrops).toBe(1);
    expect(after.reliability).toBeCloseTo(10 / 11);
  });

  it("create game: rejects past times and bad ranges, blocks a double-booked field, then posts", async () => {
    const host = await makeProfile("Test Host", 1200, 10);
    const when = new Date(Date.now() + 20 * 86_400_000);
    const base = { title: "[test] Posted", fieldId, startsAt: when, durationMin: 90, capacity: 14, minRating: 1000, maxRating: 1400, access: "open" as const, note: null };

    expect(await createGame(host, { ...base, startsAt: new Date(Date.now() - 60_000) })).toMatchObject({ ok: false, error: "bad_time" });
    expect(await createGame(host, { ...base, minRating: 1400, maxRating: 1000 })).toMatchObject({ ok: false, error: "bad_range" });
    expect(await createGame(host, { ...base, fieldId: "no-such-field" })).toMatchObject({ ok: false, error: "unknown_field" });

    const made = await createGame(host, base);
    expect(made.ok).toBe(true);
    if (made.ok) gameIds.push(made.gameId);
    // Same field, overlapping time: refused.
    const clash = await createGame(host, { ...base, startsAt: new Date(when.getTime() + 30 * 60_000) });
    expect(clash).toMatchObject({ ok: false, error: "field_taken" });
  });

  it("only the organizer can lock; locking balances teams and closes the roster", async () => {
    expect(await lockGame(players[1], game)).toMatchObject({ ok: false, error: "not_organizer" });
    expect(await submitResult(org, game, 1, 0)).toMatchObject({ ok: false, error: "not_locked" });

    const r = await lockGame(org, game);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.balancedWinProbA).toBeGreaterThan(0);
      expect(r.balancedWinProbA).toBeLessThan(1);
    }
    const spots = await db.select().from(schema.gamePlayers).where(eq(schema.gamePlayers.gameId, game));
    expect(spots.filter((s) => s.team === "A")).toHaveLength(2);
    expect(spots.filter((s) => s.team === "B")).toHaveLength(2);

    expect(await lockGame(org, game)).toMatchObject({ ok: false, error: "not_open" });
    expect(await joinGame(players[0], game)).toMatchObject({ ok: false, error: "not_open" });
    expect(await leaveGame(players[1], game)).toMatchObject({ ok: false, error: "locked" });
  });

  it("records a result exactly once (concurrent double submit) and moves ratings the right way", async () => {
    const spots = await db.select().from(schema.gamePlayers).where(eq(schema.gamePlayers.gameId, game));
    const before = new Map(await Promise.all(spots.map(async (s) => [s.userId, await ratingOf(s.userId)] as const)));

    expect(await submitResult(org, game, 31, 0)).toMatchObject({ ok: false, error: "invalid_score" });
    expect(await submitResult(players[1], game, 3, 1)).toMatchObject({ ok: false, error: "not_organizer" });

    const results = await Promise.all([submitResult(org, game, 3, 1), submitResult(org, game, 3, 1)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).map((r) => !r.ok && r.error)).toEqual(["already_recorded"]);
    expect(await submitResult(org, game, 3, 1)).toMatchObject({ ok: false, error: "already_recorded" });

    const ok = results.find((r) => r.ok)!;
    if (!ok.ok) throw new Error("unreachable");
    expect(ok.changes).toHaveLength(4);
    for (const c of ok.changes) {
      const prev = before.get(c.userId)!;
      const now = await ratingOf(c.userId);
      expect(c.before).toBe(prev.rating);
      expect(now.rating).toBe(c.after);
      expect(now.gamesPlayed).toBe(prev.gamesPlayed + 1); // exactly once
      if (c.team === "A") expect(c.after).toBeGreaterThan(c.before);
      else expect(c.after).toBeLessThan(c.before);
    }

    const detail = await getGame(org, game);
    expect(detail!.status).toBe("played");
    expect([detail!.scoreA, detail!.scoreB]).toEqual([3, 1]);
    expect(detail!.roster.every((p) => p.ratingBefore !== null && p.ratingAfter !== null)).toBe(true);

    const winner = ok.changes.find((c) => c.team === "A")!;
    const history = await getRatingHistory(winner.userId);
    expect(history[0]).toMatchObject({ gameId: game, before: winner.before, after: winner.after, won: true });
  });

  it("returns not_found for unknown or malformed game ids", async () => {
    expect(await joinGame(players[0], randomUUID())).toMatchObject({ ok: false, error: "not_found" });
    expect(await joinGame(players[0], "not-a-uuid")).toMatchObject({ ok: false, error: "not_found" });
    expect(await getGame(players[0], "not-a-uuid")).toBeNull();
  });
});
