import { describe, expect, it } from "vitest";
import type { Position } from "@/lib/types";
import { balanceTeams, naiveSplit, type BalancePlayer } from "./balance";

// The seeded "Tuesday Night 7v7" roster in sign-up order: the 7 strongest signed up first.
const RATINGS = [1420, 1395, 1380, 1360, 1340, 1325, 1310, 1235, 1150, 1120, 1105, 1090, 1060, 1045];
const GK_INDEXES = new Set([2, 9]);
const stacked: BalancePlayer[] = RATINGS.map((rating, i) => ({
  id: `p${String(i).padStart(2, "0")}`,
  rating,
  position: (GK_INDEXES.has(i) ? "gk" : "outfield") as Position,
}));

const avg = (ids: string[], players: BalancePlayer[]) =>
  ids.reduce((s, id) => s + players.find((p) => p.id === id)!.rating, 0) / ids.length;

describe("naiveSplit", () => {
  it("takes the first ceil(n/2) sign-ups as team A, which is lopsided for a stacked roster", () => {
    const naive = naiveSplit(stacked);
    expect(naive.teamA).toEqual(stacked.slice(0, 7).map((p) => p.id));
    expect(naive.teamB).toEqual(stacked.slice(7).map((p) => p.id));
    expect(naive.winProbA).toBeGreaterThan(0.75);
  });

  it("gives the extra player to team A for odd rosters", () => {
    const naive = naiveSplit(stacked.slice(0, 5));
    expect(naive.teamA).toHaveLength(3);
    expect(naive.teamB).toHaveLength(2);
  });
});

describe("balanceTeams", () => {
  it("gets the stacked 14-player roster to near 50/50, 7 v 7, with every player placed once", () => {
    const { teamA, teamB, winProbA } = balanceTeams(stacked);
    expect(teamA).toHaveLength(7);
    expect(teamB).toHaveLength(7);
    expect(new Set([...teamA, ...teamB]).size).toBe(14);
    expect(Math.abs(winProbA - 0.5)).toBeLessThan(0.02);
    expect(Math.abs(avg(teamA, stacked) - avg(teamB, stacked))).toBeLessThan(5);
    expect(Math.abs(winProbA - 0.5)).toBeLessThan(Math.abs(naiveSplit(stacked).winProbA - 0.5));
  });

  it("finds the true optimum (matches a brute force over all 1716 splits)", () => {
    const { teamA, teamB } = balanceTeams(stacked);
    const best = bruteForceBestGap(stacked);
    expect(Math.abs(avg(teamA, stacked) - avg(teamB, stacked))).toBeCloseTo(best, 9);
  });

  it("puts at least one goalkeeper on each team when there are 2+", () => {
    // Two keepers who would otherwise land together (both the weakest players).
    const players: BalancePlayer[] = [
      { id: "a", rating: 1400, position: "outfield" },
      { id: "b", rating: 1400, position: "outfield" },
      { id: "c", rating: 1200, position: "outfield" },
      { id: "d", rating: 1200, position: "outfield" },
      { id: "e", rating: 1000, position: "gk" },
      { id: "f", rating: 1000, position: "gk" },
    ];
    const { teamA, teamB } = balanceTeams(players);
    const gks = (ids: string[]) => ids.filter((id) => players.find((p) => p.id === id)!.position === "gk").length;
    expect(gks(teamA)).toBe(1);
    expect(gks(teamB)).toBe(1);

    // And on the 14-player roster, for every possible pair of keepers.
    for (let i = 0; i < 14; i++) {
      for (let j = i + 1; j < 14; j++) {
        const roster = stacked.map((p, k) => ({ ...p, position: (k === i || k === j ? "gk" : "outfield") as Position }));
        const split = balanceTeams(roster);
        const gkIn = (ids: string[]) => ids.filter((id) => roster.find((p) => p.id === id)!.position === "gk").length;
        expect(gkIn(split.teamA)).toBe(1);
        expect(gkIn(split.teamB)).toBe(1);
      }
    }
  });

  it("allows a lone goalkeeper on either side (the rule only applies with 2+)", () => {
    const players = stacked.map((p, i) => ({ ...p, position: (i === 0 ? "gk" : "outfield") as Position }));
    expect(() => balanceTeams(players)).not.toThrow();
  });

  it("is deterministic and independent of input order", () => {
    const first = balanceTeams(stacked);
    expect(balanceTeams(stacked)).toEqual(first);
    const shuffled = [...stacked].reverse();
    const again = balanceTeams(shuffled);
    expect(new Set([again.teamA.join(), again.teamB.join()])).toEqual(new Set([first.teamA.join(), first.teamB.join()]));
    expect(again.winProbA).toBeCloseTo(first.winProbA, 12);
  });

  it("handles odd rosters (sizes floor/ceil of n/2) and tiny ones", () => {
    const five = balanceTeams(stacked.slice(0, 5));
    expect([five.teamA.length, five.teamB.length].sort()).toEqual([2, 3]);
    expect(balanceTeams([])).toEqual({ teamA: [], teamB: [], winProbA: 0.5 });
  });

  it("falls back gracefully for very large rosters", () => {
    const big: BalancePlayer[] = Array.from({ length: 30 }, (_, i) => ({
      id: `q${String(i).padStart(2, "0")}`,
      rating: 900 + ((i * 137) % 600),
      position: (i % 10 === 0 ? "gk" : "outfield") as Position,
    }));
    const { teamA, teamB, winProbA } = balanceTeams(big);
    expect(teamA).toHaveLength(15);
    expect(teamB).toHaveLength(15);
    expect(Math.abs(winProbA - 0.5)).toBeLessThan(0.02);
  });
});

// Independent reference: enumerate every subset of size n/2 (n even), applying the goalkeeper rule.
function bruteForceBestGap(players: BalancePlayer[]): number {
  const n = players.length;
  let best = Infinity;
  const total = players.reduce((s, p) => s + p.rating, 0);
  for (let mask = 0; mask < 1 << n; mask++) {
    let count = 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        count++;
        sum += players[i].rating;
      }
    }
    if (count !== n / 2) continue;
    const gks = players.filter((p, i) => mask & (1 << i) && p.position === "gk").length;
    const gkTotal = players.filter((p) => p.position === "gk").length;
    if (gkTotal >= 2 && (gks === 0 || gks === gkTotal)) continue;
    best = Math.min(best, Math.abs(sum / count - (total - sum) / (n - count)));
  }
  return best;
}
