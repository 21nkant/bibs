// Team balancing. Pure: no DB.
//
// The naive way pickup games split teams is sign-up order (first half vs second half), which is
// lopsided whenever the strong players sign up first. balanceTeams instead searches every split
// and keeps the one whose team-average ratings are closest, so the predicted result is near 50/50.
import type { Position } from "@/lib/types";
import { average, expectedScore } from "./elo";

export type BalancePlayer = { id: string; rating: number; position: Position };
export type TeamSplit = { teamA: string[]; teamB: string[]; winProbA: number };

// Exhaustive search up to this many players: 22 players = C(21,10) = 352,716 splits, a few ms.
// Larger rosters (rare in pickup) fall back to a greedy split improved by pairwise swaps.
const EXHAUSTIVE_MAX = 22;

/** Probability team A wins, from team-average ratings (0.5 if either side is empty). */
export function winProbability(ratingsA: readonly number[], ratingsB: readonly number[]): number {
  if (ratingsA.length === 0 || ratingsB.length === 0) return 0.5;
  return expectedScore(average(ratingsA), average(ratingsB));
}

/** Sign-up-order split: the first ceil(n/2) players are team A, the rest team B. */
export function naiveSplit(rosterInSignUpOrder: readonly { id: string; rating: number }[]): TeamSplit {
  const half = Math.ceil(rosterInSignUpOrder.length / 2);
  const a = rosterInSignUpOrder.slice(0, half);
  const b = rosterInSignUpOrder.slice(half);
  return {
    teamA: a.map((p) => p.id),
    teamB: b.map((p) => p.id),
    winProbA: winProbability(
      a.map((p) => p.rating),
      b.map((p) => p.rating),
    ),
  };
}

/**
 * The fairest split: team sizes floor/ceil(n/2), minimal |avgA - avgB|.
 * If there are 2+ goalkeepers, each team gets at least one.
 * Deterministic: the same set of players always yields the same teams, whatever the input order.
 */
export function balanceTeams(players: readonly BalancePlayer[]): TeamSplit {
  // Sort by id so the result never depends on input order; ties resolve to the first split found.
  const sorted = [...players].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  const n = sorted.length;
  if (n < 2) return { teamA: sorted.map((p) => p.id), teamB: [], winProbA: 0.5 };

  const inA = n <= EXHAUSTIVE_MAX ? exhaustive(sorted) : greedyWithSwaps(sorted);
  const a = sorted.filter((_, i) => inA[i]);
  const b = sorted.filter((_, i) => !inA[i]);
  return {
    teamA: a.map((p) => p.id),
    teamB: b.map((p) => p.id),
    winProbA: winProbability(
      a.map((p) => p.rating),
      b.map((p) => p.rating),
    ),
  };
}

// |sumA/sizeA - sumB/sizeB| as an exact fraction, so ties compare exactly (no float drift).
type Gap = { num: number; den: number };
const gap = (sumA: number, sizeA: number, sumB: number, sizeB: number): Gap => ({
  num: Math.abs(sumA * sizeB - sumB * sizeA),
  den: sizeA * sizeB,
});
const smaller = (x: Gap, y: Gap) => x.num * y.den < y.num * x.den;

function exhaustive(players: readonly BalancePlayer[]): boolean[] {
  const n = players.length;
  const total = players.reduce((s, p) => s + p.rating, 0);
  const gkTotal = players.filter((p) => p.position === "gk").length;
  const needGkEach = gkTotal >= 2;
  // Player 0 is always on team A, which skips every mirror-image duplicate.
  const sizes = n % 2 === 0 ? [n / 2] : [Math.floor(n / 2), Math.ceil(n / 2)];

  let best: { mask: number; sizeA: number; gap: Gap } | null = null;
  for (const sizeA of sizes) {
    const pick = sizeA - 1; // chosen from players 1..n-1, encoded as bits 0..n-2
    const bits = n - 1;
    const limit = 1 << bits;
    // Gosper's hack: every `bits`-bit mask with exactly `pick` ones, in increasing order.
    for (let mask = pick === 0 ? 0 : (1 << pick) - 1; mask < limit; ) {
      let sumA = players[0].rating;
      let gkA = players[0].position === "gk" ? 1 : 0;
      for (let i = 0; i < bits; i++) {
        if (mask & (1 << i)) {
          sumA += players[i + 1].rating;
          if (players[i + 1].position === "gk") gkA++;
        }
      }
      if (!needGkEach || (gkA >= 1 && gkA <= gkTotal - 1)) {
        const g = gap(sumA, sizeA, total - sumA, n - sizeA);
        if (!best || smaller(g, best.gap)) best = { mask, sizeA, gap: g };
      }
      if (mask === 0) break;
      const c = mask & -mask;
      const r = mask + c;
      mask = (((r ^ mask) >>> 2) / c) | r;
    }
  }
  // A valid split always exists (n >= 2, and 2+ goalkeepers can always be separated).
  const mask = best!.mask;
  return players.map((_, i) => i === 0 || (mask & (1 << (i - 1))) !== 0);
}

function greedyWithSwaps(players: readonly BalancePlayer[]): boolean[] {
  const n = players.length;
  const sizeA = Math.ceil(n / 2);
  const gkTotal = players.filter((p) => p.position === "gk").length;
  const inA = new Array<boolean>(n).fill(false);

  // Greedy: strongest first, each to the weaker team that still has room.
  const order = players.map((_, i) => i).sort((x, y) => players[y].rating - players[x].rating || x - y);
  let sumA = 0;
  let sumB = 0;
  let countA = 0;
  let countB = 0;
  for (const i of order) {
    const toA = countA < sizeA && (countB >= n - sizeA || sumA / Math.max(1, countA) <= sumB / Math.max(1, countB));
    inA[i] = toA;
    if (toA) {
      sumA += players[i].rating;
      countA++;
    } else {
      sumB += players[i].rating;
      countB++;
    }
  }

  // Score = (goalkeeper-rule violation, rating gap); improve with the best swap until none helps.
  const score = () => {
    const gkA = players.filter((p, i) => inA[i] && p.position === "gk").length;
    const violation = gkTotal >= 2 && (gkA === 0 || gkA === gkTotal) ? 1 : 0;
    return { violation, gap: gap(sumA, countA, sumB, countB) };
  };
  const better = (x: ReturnType<typeof score>, y: ReturnType<typeof score>) =>
    x.violation !== y.violation ? x.violation < y.violation : smaller(x.gap, y.gap);

  for (;;) {
    let current = score();
    let bestSwap: [number, number] | null = null;
    for (let i = 0; i < n; i++) {
      if (!inA[i]) continue;
      for (let j = 0; j < n; j++) {
        if (inA[j]) continue;
        const d = players[j].rating - players[i].rating;
        inA[i] = false;
        inA[j] = true;
        sumA += d;
        sumB -= d;
        const s = score();
        if (better(s, current)) {
          current = s;
          bestSwap = [i, j];
        }
        inA[i] = true;
        inA[j] = false;
        sumA -= d;
        sumB += d;
      }
    }
    if (!bestSwap) return inA;
    const [i, j] = bestSwap;
    const d = players[j].rating - players[i].rating;
    inA[i] = false;
    inA[j] = true;
    sumA += d;
    sumB -= d;
  }
}
