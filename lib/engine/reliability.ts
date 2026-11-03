// Reliability: how often a player shows up for games they committed to.
// A "late drop" is leaving a joined spot within LATE_DROP_WINDOW_MS of kickoff (enforced in leaveGame).

export const LATE_DROP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isLateDrop(startsAt: Date, now: Date): boolean {
  const msToKickoff = startsAt.getTime() - now.getTime();
  return msToKickoff > 0 && msToKickoff < LATE_DROP_WINDOW_MS;
}

// Share of commitments kept: games played / (games played + late drops), 0..1.
// null until there's any history, so new players aren't shown as 100% or 0%.
export function reliability(gamesPlayed: number, lateDrops: number): number | null {
  const commitments = gamesPlayed + lateDrops;
  return commitments === 0 ? null : gamesPlayed / commitments;
}
