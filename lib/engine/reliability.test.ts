import { describe, expect, it } from "vitest";
import { isLateDrop, reliability } from "./reliability";

describe("reliability", () => {
  it("is games played over commitments, null with no history", () => {
    expect(reliability(0, 0)).toBeNull();
    expect(reliability(24, 0)).toBe(1);
    expect(reliability(24, 1)).toBeCloseTo(0.96);
    expect(reliability(0, 2)).toBe(0);
  });

  it("counts a drop as late only inside the 24h before kickoff", () => {
    const kickoff = new Date("2026-11-05T19:00:00-05:00");
    const hoursBefore = (h: number) => new Date(kickoff.getTime() - h * 3_600_000);
    expect(isLateDrop(kickoff, hoursBefore(5))).toBe(true);
    expect(isLateDrop(kickoff, hoursBefore(23.9))).toBe(true);
    expect(isLateDrop(kickoff, hoursBefore(24.1))).toBe(false);
    expect(isLateDrop(kickoff, hoursBefore(-1))).toBe(false); // already started
  });
});
