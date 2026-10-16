import { formatSigned } from "./format";
import type { QualiRow, ResultRow } from "./types";

export const DNS_STATUSES = new Set([
  "Did not start",
  "Did not qualify",
  "Did not prequalify",
  "Withdrew",
  "Excluded",
]);

export type Classification = "classified" | "dnf" | "dsq" | "dns";

export function classificationOf(status: string, positionText?: string | null): Classification {
  if (status === "Disqualified") return "dsq";
  if (DNS_STATUSES.has(status)) return "dns";
  if (status === "Finished" || status.startsWith("+")) return "classified";
  // Jolpica uses "Lapped" for a classified finisher. A position letter such as "R" stays unclassified.
  if (status === "Lapped" && positionText != null && /^\d+$/.test(positionText.trim())) return "classified";
  return "dnf";
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sampleStdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values);
  if (average == null) return null;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function representativeLaps(seconds: number[], ratio = 1.07): number[] {
  const mid = median(seconds);
  if (mid == null) return [];
  return seconds.filter((value) => value <= mid * ratio);
}

export type DriverStats = {
  starts: number;
  classified: number;
  dnfs: number;
  dns: number;
  dsq: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  sprintWins: number;
  sprintPodiums: number;
  sprintFastestLaps: number;
  racePoints: number;
  sprintPoints: number;
  points: number;
  avgFinish: number | null;
  avgQuali: number | null;
  avgPlacesFromQuali: number | null;
  avgPlacesFromGrid: number | null;
  finishRate: number | null;
  dnfRate: number | null;
  pointsPerStart: number | null;
  consistency: number | null;
  firstHalfAvg: number | null;
  secondHalfAvg: number | null;
};

function uniqueByRound<T extends { round: number }>(rows: T[]): T[] {
  const seen = new Set<number>();
  const unique: T[] = [];
  for (const row of rows) {
    if (seen.has(row.round)) continue;
    seen.add(row.round);
    unique.push(row);
  }
  return unique;
}

export function summarizeDriver(
  driverId: string,
  races: ResultRow[],
  qualifying: QualiRow[],
  sprints: ResultRow[],
): DriverStats {
  const mine = uniqueByRound(races.filter((row) => row.driver.id === driverId && row.kind === "race"));
  const mySprints = uniqueByRound(sprints.filter((row) => row.driver.id === driverId));
  const myQuali = uniqueByRound(qualifying.filter((row) => row.driver.id === driverId));
  const classifiedRows = mine.filter((row) => classificationOf(row.status, row.positionText) === "classified" && row.position != null);
  const qualiByRound = new Map(myQuali.map((row) => [row.round, row]));
  const qualiDeltas: number[] = [];
  const gridDeltas: number[] = [];
  for (const row of classifiedRows) {
    const quali = qualiByRound.get(row.round);
    if (quali?.position != null && row.position != null) qualiDeltas.push(quali.position - row.position);
    if (row.grid != null && row.position != null) gridDeltas.push(row.grid - row.position);
  }
  const ordered = [...classifiedRows].sort((a, b) => a.round - b.round);
  let firstHalfAvg: number | null = null;
  let secondHalfAvg: number | null = null;
  if (ordered.length >= 6) {
    const mid = Math.floor(ordered.length / 2);
    firstHalfAvg = mean(ordered.slice(0, mid).map((row) => row.position ?? 0));
    secondHalfAvg = mean(ordered.slice(mid).map((row) => row.position ?? 0));
  }
  const racePoints = mine.reduce((sum, row) => sum + row.points, 0);
  const sprintPoints = mySprints.reduce((sum, row) => sum + row.points, 0);
  const starts = mine.length;
  const classified = classifiedRows.length;
  const dnfs = mine.filter((row) => classificationOf(row.status, row.positionText) === "dnf").length;
  return {
    starts,
    classified,
    dnfs,
    dns: mine.filter((row) => classificationOf(row.status, row.positionText) === "dns").length,
    dsq: mine.filter((row) => classificationOf(row.status, row.positionText) === "dsq").length,
    wins: new Set(classifiedRows.filter((row) => row.position === 1).map((row) => row.round)).size,
    podiums: classifiedRows.filter((row) => row.position != null && row.position <= 3).length,
    poles: new Set(myQuali.filter((row) => row.position === 1).map((row) => row.round)).size,
    fastestLaps: new Set(mine.filter((row) => row.fastestLapRank === 1).map((row) => row.round)).size,
    sprintWins: mySprints.filter((row) => classificationOf(row.status, row.positionText) === "classified" && row.position === 1).length,
    sprintPodiums: mySprints.filter(
      (row) => classificationOf(row.status, row.positionText) === "classified" && row.position != null && row.position <= 3,
    ).length,
    sprintFastestLaps: mySprints.filter((row) => row.fastestLapRank === 1).length,
    racePoints,
    sprintPoints,
    points: racePoints + sprintPoints,
    avgFinish: mean(classifiedRows.map((row) => row.position ?? 0)),
    avgQuali: mean(myQuali.flatMap((row) => (row.position == null ? [] : [row.position]))),
    avgPlacesFromQuali: mean(qualiDeltas),
    avgPlacesFromGrid: mean(gridDeltas),
    finishRate: starts ? classified / starts : null,
    dnfRate: starts ? dnfs / starts : null,
    pointsPerStart: starts ? racePoints / starts : null,
    consistency: sampleStdev(classifiedRows.map((row) => row.position ?? 0)),
    firstHalfAvg,
    secondHalfAvg,
  };
}

export function trendLines(stats: DriverStats): string[] {
  if (stats.starts === 0) return ["No race starts are recorded for this driver in the selected season."];
  const lines = [`Classified in ${stats.classified} of ${stats.starts} starts.`];
  if (stats.avgFinish != null) lines.push(`Average classified finish is ${stats.avgFinish.toFixed(2)}.`);
  if (stats.consistency != null) {
    lines.push(`Finish consistency, measured as the sample standard deviation, is ${stats.consistency.toFixed(2)}.`);
  }
  if (stats.avgPlacesFromQuali != null) {
    lines.push(
      `Average change from qualifying to the classified finish is ${formatSigned(stats.avgPlacesFromQuali)} places. Positive means positions gained.`,
    );
  }
  if (stats.firstHalfAvg != null && stats.secondHalfAvg != null) {
    const delta = stats.firstHalfAvg - stats.secondHalfAvg;
    if (Math.abs(delta) < 0.15) {
      lines.push("First-half and second-half average classified finishes are within 0.15 places.");
    } else if (delta > 0) {
      lines.push(`Second-half average finish is ${delta.toFixed(2)} places better than the first half.`);
    } else {
      lines.push(`First-half average finish is ${Math.abs(delta).toFixed(2)} places better than the second half.`);
    }
  }
  return lines;
}

export function finishBuckets(rows: ResultRow[]): { label: string; count: number }[] {
  const counts = new Map<string, number>([
    ["P1", 0],
    ["P2", 0],
    ["P3", 0],
    ["P4–P5", 0],
    ["P6–P10", 0],
    ["P11+", 0],
    ["DNF", 0],
    ["DSQ", 0],
    ["DNS", 0],
    ["Other", 0],
  ]);
  const add = (label: string) => counts.set(label, (counts.get(label) ?? 0) + 1);
  for (const row of uniqueByRound(rows.filter((item) => item.kind === "race"))) {
    const kind = classificationOf(row.status, row.positionText);
    if (kind === "dnf") add("DNF");
    else if (kind === "dsq") add("DSQ");
    else if (kind === "dns") add("DNS");
    else if (row.position === 1) add("P1");
    else if (row.position === 2) add("P2");
    else if (row.position === 3) add("P3");
    else if (row.position != null && row.position <= 5) add("P4–P5");
    else if (row.position != null && row.position <= 10) add("P6–P10");
    else if (row.position != null) add("P11+");
    else add("Other");
  }
  return [...counts.entries()].filter(([, count]) => count > 0).map(([label, count]) => ({ label, count }));
}

export type GridMove = {
  driverId: string;
  name: string;
  round: number;
  grid: number;
  finish: number;
  delta: number;
};

export function gridMoves(results: ResultRow[]): GridMove[] {
  const seen = new Set<string>();
  const moves: GridMove[] = [];
  for (const row of results) {
    if (row.kind !== "race" || row.grid == null || row.position == null) continue;
    if (classificationOf(row.status, row.positionText) !== "classified") continue;
    const key = `${row.round}:${row.driver.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    moves.push({
      driverId: row.driver.id,
      name: row.driver.name,
      round: row.round,
      grid: row.grid,
      finish: row.position,
      delta: row.grid - row.position,
    });
  }
  return moves;
}

export type HeadToHeadEntry = {
  round: number;
  quali: number | null;
  finish: number | null;
  classified: boolean;
};

export type HeadToHead = {
  qualiCompared: number;
  qualiA: number;
  qualiB: number;
  qualiTied: number;
  raceCompared: number;
  raceA: number;
  raceB: number;
  raceTied: number;
};

export function headToHead(a: HeadToHeadEntry[], b: HeadToHeadEntry[]): HeadToHead {
  const rightByRound = new Map(b.map((entry) => [entry.round, entry]));
  const seen = new Set<number>();
  const result: HeadToHead = {
    qualiCompared: 0,
    qualiA: 0,
    qualiB: 0,
    qualiTied: 0,
    raceCompared: 0,
    raceA: 0,
    raceB: 0,
    raceTied: 0,
  };
  for (const left of a) {
    if (seen.has(left.round)) continue;
    seen.add(left.round);
    const right = rightByRound.get(left.round);
    if (!right) continue;
    if (left.quali != null && right.quali != null) {
      result.qualiCompared += 1;
      if (left.quali < right.quali) result.qualiA += 1;
      else if (right.quali < left.quali) result.qualiB += 1;
      else result.qualiTied += 1;
    }
    if (!left.classified && !right.classified) continue;
    if (left.classified && !right.classified) {
      result.raceCompared += 1;
      result.raceA += 1;
      continue;
    }
    if (right.classified && !left.classified) {
      result.raceCompared += 1;
      result.raceB += 1;
      continue;
    }
    if (left.finish == null || right.finish == null) continue;
    result.raceCompared += 1;
    if (left.finish < right.finish) result.raceA += 1;
    else if (right.finish < left.finish) result.raceB += 1;
    else result.raceTied += 1;
  }
  return result;
}

export type Score = { round: number; id: string; name: string; points: number };
export type RoundLabel = { round: number; label: string };
export type ProgressionPoint = { round: number; label: string; value: number };
export type ProgressionSeries = { id: string; name: string; points: ProgressionPoint[] };

export function buildProgression(rounds: RoundLabel[], scores: Score[]): ProgressionSeries[] {
  const names = new Map<string, string>();
  const perRound = new Map<number, Map<string, number>>();
  const ordered = [...rounds];
  const known = new Set(ordered.map((round) => round.round));
  for (const score of scores) {
    names.set(score.id, score.name);
    const bucket = perRound.get(score.round) ?? new Map<string, number>();
    bucket.set(score.id, (bucket.get(score.id) ?? 0) + score.points);
    perRound.set(score.round, bucket);
    if (!known.has(score.round)) {
      ordered.push({ round: score.round, label: `Round ${score.round}` });
      known.add(score.round);
    }
  }
  ordered.sort((a, b) => a.round - b.round);
  const totals = new Map<string, number>();
  const points = new Map<string, ProgressionPoint[]>();
  for (const id of names.keys()) {
    totals.set(id, 0);
    points.set(id, []);
  }
  for (const round of ordered) {
    const bucket = perRound.get(round.round);
    if (bucket) {
      for (const [id, value] of bucket) totals.set(id, (totals.get(id) ?? 0) + value);
    }
    for (const id of names.keys()) {
      points.get(id)?.push({ round: round.round, label: round.label, value: totals.get(id) ?? 0 });
    }
  }
  return [...names.entries()].map(([id, name]) => ({ id, name, points: points.get(id) ?? [] }));
}

export function orderSeries<T extends { id: string }>(series: T[], order: string[], limit: number): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...series]
    .sort((a, b) => {
      const left = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const right = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (left !== right) return left - right;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

export function finalProgress(series: ProgressionSeries): number {
  return series.points.length ? series.points[series.points.length - 1].value : 0;
}

export function pointsMismatch(
  official: { id: string; points: number }[],
  series: ProgressionSeries[],
): { id: string; official: number; session: number }[] {
  const mismatches: { id: string; official: number; session: number }[] = [];
  for (const row of official) {
    const match = series.find((item) => item.id === row.id);
    if (!match || match.points.length === 0) continue;
    const session = match.points[match.points.length - 1].value;
    if (Math.abs(session - row.points) > 0.05) mismatches.push({ id: row.id, official: row.points, session });
  }
  return mismatches;
}

export type SeasonBattle = {
  season: number;
  inProgress: boolean;
  leader: string;
  leaderId: string;
  leaderPoints: number;
  leaderWins: number;
  second: string | null;
  secondId: string | null;
  secondPoints: number | null;
  gap: number | null;
  rounds: number | null;
};

export function completedBattles(rows: SeasonBattle[]): SeasonBattle[] {
  return rows.filter((row) => !row.inProgress && row.gap != null && row.second);
}

export function closestBattles(rows: SeasonBattle[]): SeasonBattle[] {
  return completedBattles(rows).sort((a, b) => a.gap! - b.gap! || a.season - b.season);
}

export function dominantBattles(rows: SeasonBattle[]): SeasonBattle[] {
  return completedBattles(rows).sort((a, b) => b.gap! - a.gap! || b.season - a.season);
}

export function highestWinRates(rows: SeasonBattle[]): SeasonBattle[] {
  const eligible = completedBattles(rows).filter((row) => row.rounds != null && row.rounds > 0);
  if (!eligible.length) return [];
  const ranked = [...eligible].sort((a, b) => {
    const left = a.leaderWins / a.rounds!;
    const right = b.leaderWins / b.rounds!;
    if (right !== left) return right - left;
    return b.leaderWins - a.leaderWins || a.season - b.season;
  });
  const best = ranked[0];
  return ranked.filter((row) => row.leaderWins === best.leaderWins && row.rounds === best.rounds);
}

export function betterIndex(values: (number | null)[], lowerBetter: boolean): number | null {
  const present = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (present.length < 2) return null;
  const target = lowerBetter ? Math.min(...present) : Math.max(...present);
  const indexes = values.flatMap((value, index) => (value === target ? [index] : []));
  return indexes.length === 1 ? indexes[0] : null;
}

export function pointShares(rows: { id: string; points: number }[]): { id: string; points: number; share: number | null }[] {
  const total = rows.reduce((sum, row) => sum + row.points, 0);
  return rows.map((row) => ({ ...row, share: total > 0 ? row.points / total : null }));
}

export function raceInsights(
  results: ResultRow[],
  qualifying: QualiRow[],
  pits: { driverName: string; lap: number; duration: number | null }[],
): string[] {
  if (!results.length) return [];
  const lines: string[] = [];
  const classified = results.filter((row) => classificationOf(row.status, row.positionText) === "classified");
  const dnfs = results.filter((row) => classificationOf(row.status, row.positionText) === "dnf");
  const dsq = results.filter((row) => classificationOf(row.status, row.positionText) === "dsq");
  lines.push(
    `${classified.length} classified finisher${classified.length === 1 ? "" : "s"} and ${dnfs.length} retirement${dnfs.length === 1 ? "" : "s"}${dsq.length ? `, plus ${dsq.length} disqualified` : ""}.`,
  );
  const winner = results.find((row) => row.position === 1 && classificationOf(row.status, row.positionText) === "classified");
  if (winner) lines.push(`${winner.driver.name} classified P1${winner.time ? ` in ${winner.time}` : ""}.`);
  const fastest = results.find((row) => row.fastestLapRank === 1 && row.fastestLapTime);
  if (fastest) {
    lines.push(
      `Fastest lap: ${fastest.driver.name}${fastest.fastestLapLap ? `, lap ${fastest.fastestLapLap}` : ""}, ${fastest.fastestLapTime}.`,
    );
  }
  const pole = qualifying.find((row) => row.position === 1);
  if (pole) {
    const race = results.find((row) => row.driver.id === pole.driver.id);
    if (race) {
      const place = race.position != null ? `P${race.position}` : race.status;
      lines.push(`${pole.driver.name} took pole and is recorded as ${place} (${race.status}).`);
    }
  }
  const movers = results.filter(
    (row) => row.grid != null && row.position != null && classificationOf(row.status, row.positionText) === "classified",
  );
  if (movers.length) {
    const ranked = [...movers].sort((a, b) => b.grid! - b.position! - (a.grid! - a.position!));
    const gain = ranked[0];
    const loss = ranked[ranked.length - 1];
    const gainDelta = gain.grid! - gain.position!;
    const lossDelta = loss.grid! - loss.position!;
    if (gainDelta > 0) {
      lines.push(`Largest gain from the grid among classified finishers: ${gain.driver.name}, P${gain.grid} to P${gain.position} (+${gainDelta}).`);
    }
    if (lossDelta < 0 && loss.driver.id !== gain.driver.id) {
      lines.push(`Largest loss from the grid among classified finishers: ${loss.driver.name}, P${loss.grid} to P${loss.position} (${lossDelta}).`);
    }
  }
  const timed = pits.filter((pit) => pit.duration != null);
  if (timed.length) {
    const best = [...timed].sort((a, b) => a.duration! - b.duration!)[0];
    lines.push(`Shortest pit duration in the feed: ${best.driverName}, ${best.duration!.toFixed(3)}s on lap ${best.lap}.`);
  }
  return lines;
}
