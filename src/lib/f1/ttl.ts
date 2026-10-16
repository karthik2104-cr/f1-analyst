export const TTL = {
  scheduleCurrent: 6 * 60 * 60 * 1000,
  schedulePast: 7 * 24 * 60 * 60 * 1000,
  standingsCurrent: 30 * 60 * 1000,
  standingsPast: 7 * 24 * 60 * 60 * 1000,
  resultsCurrent: 60 * 60 * 1000,
  resultsPast: 7 * 24 * 60 * 60 * 1000,
  laps: 24 * 60 * 60 * 1000,
  circuits: 7 * 24 * 60 * 60 * 1000,
  seasons: 24 * 60 * 60 * 1000,
  career: 24 * 60 * 60 * 1000,
} as const;

export function ttlForSeason(season: number, current: number | null, currentTtl: number, pastTtl: number): number {
  if (current != null && season >= current) return currentTtl;
  return pastTtl;
}
