import { describe, expect, it } from "vitest";
import { expectedScore, kFactor, outcome, rateGame, ratingDelta } from "./elo";

describe("expectedScore", () => {
  it("1250 vs 1300 is about 0.43", () => {
    expect(expectedScore(1250, 1300)).toBeCloseTo(0.4285, 3);
  });

  it("is 0.5 for equal teams and symmetric", () => {
    expect(expectedScore(1200, 1200)).toBe(0.5);
    expect(expectedScore(1250, 1300) + expectedScore(1300, 1250)).toBeCloseTo(1, 10);
  });
});

describe("ratingDelta", () => {
  it("1250 beating 1300 at K=30 gains 17", () => {
    expect(ratingDelta(30, 1, expectedScore(1250, 1300))).toBe(17);
  });

  it("losing as the favourite costs points; a draw as the underdog gains a little", () => {
    expect(ratingDelta(30, 0, expectedScore(1300, 1250))).toBe(-17);
    expect(ratingDelta(30, 0.5, expectedScore(1250, 1300))).toBe(2);
  });
});

describe("kFactor", () => {
  it("is 40 while provisional (under 5 games), then 24", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(4)).toBe(40);
    expect(kFactor(5)).toBe(24);
    expect(kFactor(40)).toBe(24);
  });
});

describe("outcome", () => {
  it("maps scores to 1 / 0.5 / 0", () => {
    expect(outcome(3, 1)).toBe(1);
    expect(outcome(2, 2)).toBe(0.5);
    expect(outcome(0, 1)).toBe(0);
  });
});

describe("rateGame", () => {
  const players = [
    { id: "a1", rating: 1200, gamesPlayed: 10, team: "A" as const },
    { id: "a2", rating: 1300, gamesPlayed: 2, team: "A" as const }, // provisional
    { id: "b1", rating: 1250, gamesPlayed: 10, team: "B" as const },
    { id: "b2", rating: 1350, gamesPlayed: 10, team: "B" as const },
  ];

  it("uses team averages: every winner gains, every loser drops, provisional moves more", () => {
    const changes = rateGame(players, 2, 1); // A (avg 1250) beats B (avg 1300)
    const by = Object.fromEntries(changes.map((c) => [c.id, c]));
    const e = expectedScore(1250, 1300);
    expect(by.a1.delta).toBe(Math.round(24 * (1 - e))); // 14
    expect(by.a2.delta).toBe(Math.round(40 * (1 - e))); // 23
    expect(by.b1.delta).toBe(Math.round(24 * (0 - (1 - e)))); // -14
    expect(by.b2.delta).toBe(by.b1.delta);
    expect(by.a2.delta).toBeGreaterThan(by.a1.delta);
    for (const c of changes) expect(c.after).toBe(c.before + c.delta);
  });

  it("a draw between unequal teams moves the underdog up and the favourite down", () => {
    const changes = rateGame(players, 1, 1);
    expect(changes.find((c) => c.id === "a1")!.delta).toBeGreaterThan(0);
    expect(changes.find((c) => c.id === "b1")!.delta).toBeLessThan(0);
  });
});
