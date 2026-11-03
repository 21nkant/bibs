// Team Elo. Pure: no DB, no clock. The service layer feeds it ratings and writes the results.
//
// Every player's expected score uses TEAM AVERAGE ratings (a 1500 on a weak team is still
// expected to lose), and every player on a team gets the same actual score (win/draw/loss).
// Only K differs per player: new players move fast until their rating settles.

export const PROVISIONAL_GAMES = 5;
export const K_PROVISIONAL = 40;
export const K_ESTABLISHED = 24;

export type Outcome = 1 | 0.5 | 0;

/** Probability that a team with average `teamAvg` beats one with average `oppAvg`. */
export function expectedScore(teamAvg: number, oppAvg: number): number {
  return 1 / (1 + 10 ** ((oppAvg - teamAvg) / 400));
}

/** K = 40 while provisional (fewer than 5 games played), then 24. */
export function kFactor(gamesPlayed: number): number {
  return gamesPlayed < PROVISIONAL_GAMES ? K_PROVISIONAL : K_ESTABLISHED;
}

/** 1 for a win, 0.5 for a draw, 0 for a loss, from this team's point of view. */
export function outcome(goalsFor: number, goalsAgainst: number): Outcome {
  return goalsFor > goalsAgainst ? 1 : goalsFor < goalsAgainst ? 0 : 0.5;
}

/** Rating change for one player: round(K * (actual - expected)). */
export function ratingDelta(k: number, actual: number, expected: number): number {
  return Math.round(k * (actual - expected));
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export type EloPlayer = { id: string; rating: number; gamesPlayed: number; team: "A" | "B" };
export type EloChange = { id: string; team: "A" | "B"; before: number; after: number; delta: number };

/** New ratings for every player of a finished game. Both teams must have at least one player. */
export function rateGame(players: readonly EloPlayer[], scoreA: number, scoreB: number): EloChange[] {
  const avgA = average(players.filter((p) => p.team === "A").map((p) => p.rating));
  const avgB = average(players.filter((p) => p.team === "B").map((p) => p.rating));
  const expectedA = expectedScore(avgA, avgB);
  const actualA = outcome(scoreA, scoreB);

  return players.map((p) => {
    const expected = p.team === "A" ? expectedA : 1 - expectedA;
    const actual = p.team === "A" ? actualA : 1 - actualA;
    const delta = ratingDelta(kFactor(p.gamesPlayed), actual, expected);
    return { id: p.id, team: p.team, before: p.rating, after: p.rating + delta, delta };
  });
}
