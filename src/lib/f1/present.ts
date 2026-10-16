import {
  buildProgression,
  classificationOf,
  closestBattles,
  dominantBattles,
  finalProgress,
  finishBuckets,
  gridMoves,
  headToHead,
  highestWinRates,
  orderSeries,
  pointShares,
  pointsMismatch,
  raceInsights,
  summarizeDriver,
  trendLines,
  type HeadToHeadEntry,
  type ProgressionSeries,
  type SeasonBattle,
} from "./analytics";
import { constructorColor, driverColor } from "./colors";
import { formatPoints, shortRace } from "./format";
import type {
  CalendarModel,
  ChartSeries,
  CircuitModel,
  CompareMetric,
  CompareModel,
  ConstructorIndexModel,
  ConstructorProfileModel,
  DriverProfileModel,
  HistoryModel,
  OverviewModel,
  RaceDetailModel,
  RaceIndexModel,
  SearchModel,
  StandingRow,
  StandingsModel,
  BriefModel,
} from "./models";
import { constructorPath, driverPath, racePath, withSeason } from "./routes";
import { racePhase, toUtcIso } from "./schedule";
import { DEFINITIONS } from "./source";
import type {
  CareerRow,
  ConstructorStanding,
  DriverStanding,
  LapTiming,
  PitStop,
  QualiRow,
  RacePhase,
  ResultRow,
  ScheduledRace,
  SeasonBundle,
} from "./types";

function paint(series: ProgressionSeries[], order: string[], limit: number, colorFor: (id: string, index: number) => string): ChartSeries[] {
  const rankedOrder = order.length
    ? order
    : [...series].sort((a, b) => finalProgress(b) - finalProgress(a) || a.name.localeCompare(b.name)).map((item) => item.id);
  return orderSeries(series, rankedOrder, limit).map((item, index) => ({ ...item, color: colorFor(item.id, index) }));
}

function roundLabels(schedule: ScheduledRace[], results: ResultRow[], sprints: ResultRow[]) {
  const numbers = new Set<number>([...results.map((row) => row.round), ...sprints.map((row) => row.round)]);
  const labels = schedule.filter((race) => numbers.has(race.round)).map((race) => ({ round: race.round, label: shortRace(race.name) }));
  for (const round of numbers) {
    if (!labels.some((item) => item.round === round)) labels.push({ round, label: `Round ${round}` });
  }
  return labels.sort((a, b) => a.round - b.round);
}

function driverScores(results: ResultRow[], sprints: ResultRow[]) {
  return [...results, ...sprints].map((row) => ({ round: row.round, id: row.driver.id, name: row.driver.name, points: row.points }));
}

function constructorScores(results: ResultRow[], sprints: ResultRow[]) {
  return [...results, ...sprints].map((row) => ({ round: row.round, id: row.constructor.id, name: row.constructor.name, points: row.points }));
}

function progressionNote(bundle: SeasonBundle, full: ProgressionSeries[], kind: "driver" | "constructor"): string {
  if (bundle.meta.partial.some((item) => /result|sprint/i.test(item))) {
    return "This chart may be incomplete because a result feed did not load.";
  }
  if (!full.length) return "No race or sprint points have been published for this season.";
  const official =
    kind === "driver"
      ? bundle.driverStandings.map((row) => ({ id: row.driver.id, points: row.points, name: row.driver.name }))
      : bundle.constructorStandings.map((row) => ({ id: row.constructor.id, points: row.points, name: row.constructor.name }));
  if (!official.length) return "Session points are summed from race and sprint rows. Official standings have not been published.";
  const mismatches = pointsMismatch(official, full);
  if (!mismatches.length) {
    return kind === "driver"
      ? "Race and sprint points match the published driver standings."
      : "Race and sprint points scored for each constructor match the published constructor standings.";
  }
  const names = new Map(official.map((row) => [row.id, row.name]));
  const sample = mismatches
    .slice(0, 3)
    .map((row) => `${names.get(row.id) ?? row.id} (${formatPoints(row.session)} session, ${formatPoints(row.official)} official)`)
    .join("; ");
  return `Session points differ from the published standings for ${sample}.`;
}

function resultRounds(results: ResultRow[]): Set<number> {
  return new Set(results.map((row) => row.round));
}

function podiumCount(rows: ResultRow[], id: string, field: "driver" | "constructor"): number {
  return rows.filter((row) => {
    const match = field === "driver" ? row.driver.id === id : row.constructor.id === id;
    return match && classificationOf(row.status, row.positionText) === "classified" && row.position != null && row.position <= 3;
  }).length;
}

function poleCount(rows: QualiRow[], driverId: string): number {
  return new Set(rows.filter((row) => row.driver.id === driverId && row.position === 1).map((row) => row.round)).size;
}

function deltaFor(id: string, position: number, previous: Map<string, number> | null): number | "new" | null {
  if (!previous) return null;
  const prior = previous.get(id);
  if (prior == null) return "new";
  return prior - position;
}

export function buildOverview(bundle: SeasonBundle, now = new Date()): OverviewModel {
  const completedRounds = resultRounds(bundle.results);
  const phases = bundle.schedule.map((race) => ({ race, phase: racePhase(race, completedRounds.has(race.round), now) }));
  const next = phases.find((item) => item.phase === "upcoming") ?? null;
  const last = [...phases].reverse().find((item) => item.phase === "completed") ?? null;
  const lastResults = last
    ? bundle.results.filter((row) => row.round === last.race.round).sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    : [];
  const winner = lastResults.find((row) => row.position === 1 && classificationOf(row.status, row.positionText) === "classified") ?? null;
  const fastest = lastResults.find((row) => row.fastestLapRank === 1 && row.fastestLapTime);
  const labels = roundLabels(bundle.schedule, bundle.results, bundle.sprints);
  const full = buildProgression(labels, driverScores(bundle.results, bundle.sprints));
  const constructorFull = buildProgression(labels, constructorScores(bundle.results, bundle.sprints));
  const resultsPartial = bundle.meta.partial.some((item) => item.includes("race results"));
  const qualiPartial = bundle.meta.partial.some((item) => item.includes("qualifying"));
  const poles = qualiPartial ? null : new Set(bundle.qualifying.filter((row) => row.position === 1).map((row) => row.round)).size;
  const fastestLaps = resultsPartial ? null : new Set(bundle.results.filter((row) => row.fastestLapRank === 1).map((row) => row.round)).size;
  const podiums = resultsPartial
    ? null
    : bundle.results.filter((row) => classificationOf(row.status, row.positionText) === "classified" && row.position != null && row.position <= 3).length;
  const leader = bundle.driverStandings[0];
  const second = bundle.driverStandings[1];
  const constructorLeader = bundle.constructorStandings[0];
  const compareIds = bundle.driverStandings.slice(0, 2).map((row) => row.driver.id).join(",");
  const completed = phases.filter((item) => item.phase === "completed");
  const standingsRound = bundle.meta.standingsRound;
  const scheduleCount = bundle.schedule.length;
  const statusLine = !scheduleCount
    ? "No schedule was published for this season."
    : standingsRound != null && standingsRound >= scheduleCount && completed.length >= scheduleCount
      ? `Season complete. Standings include round ${standingsRound} of ${scheduleCount}.`
      : standingsRound == null
        ? `${completed.length} of ${scheduleCount} races have a classification. The standings round was not published.`
        : `Season in progress. ${completed.length} of ${scheduleCount} races are classified. Standings include round ${standingsRound}.`;
  const moves = resultsPartial ? [] : gridMoves(bundle.results);
  const namedMoves = moves.map((move) => ({
    ...move,
    id: move.driverId,
    race: bundle.schedule.find((race) => race.round === move.round)?.name ?? `Round ${move.round}`,
  }));
  const pace = resultsPartial && qualiPartial
    ? []
    : bundle.driverStandings.slice(0, 8).flatMap((row) => {
        const stats = summarizeDriver(row.driver.id, bundle.results, bundle.qualifying, bundle.sprints);
        const avgQuali = qualiPartial ? null : stats.avgQuali;
        const avgFinish = resultsPartial ? null : stats.avgFinish;
        if (avgQuali == null && avgFinish == null) return [];
        return [{ name: row.driver.code ?? row.driver.familyName, avgQuali, avgFinish }];
      });

  return {
    meta: bundle.meta,
    season: bundle.season,
    roundsScheduled: bundle.schedule.length,
    roundsCompleted: completed.length,
    nextRace: next ? { race: next.race, startIso: toUtcIso(next.race.date, next.race.time) } : null,
    awaiting: phases.filter((item) => item.phase === "awaiting-results").map((item) => ({ round: item.race.round, name: item.race.name, date: item.race.date })),
    lastRace: last
      ? {
          race: last.race,
          winner,
          podium: lastResults.filter((row) => row.position != null && row.position <= 3).slice(0, 3),
          fastestLap: fastest ? { driver: fastest.driver.name, lap: fastest.fastestLapLap, time: fastest.fastestLapTime } : null,
        }
      : null,
    driverTop: bundle.driverStandings.slice(0, 8).map((row) => ({
      position: row.position,
      id: row.driver.id,
      name: row.driver.name,
      code: row.driver.code,
      team: row.constructors[0]?.name ?? null,
      points: row.points,
      wins: row.wins,
      gap: leader ? leader.points - row.points : null,
    })),
    constructorTop: bundle.constructorStandings.slice(0, 8).map((row) => ({
      position: row.position,
      id: row.constructor.id,
      name: row.constructor.name,
      points: row.points,
      wins: row.wins,
      gap: constructorLeader ? constructorLeader.points - row.points : null,
    })),
    recent: [...completed].reverse().slice(0, 6).map((item) => {
      const raceWinner = bundle.results.find((row) => row.round === item.race.round && row.position === 1 && classificationOf(row.status, row.positionText) === "classified");
      return {
        round: item.race.round,
        name: item.race.name,
        date: item.race.date,
        winner: raceWinner?.driver.name ?? null,
        winnerId: raceWinner?.driver.id ?? null,
        team: raceWinner?.constructor.name ?? null,
        time: raceWinner?.time ?? null,
      };
    }),
    activity: [...completed].reverse().slice(0, 8).map((item) => {
      const rows = bundle.results.filter((row) => row.round === item.race.round);
      const raceWinner = rows.find((row) => row.position === 1 && classificationOf(row.status, row.positionText) === "classified");
      const pole = bundle.qualifying.find((row) => row.round === item.race.round && row.position === 1);
      const lap = rows.find((row) => row.fastestLapRank === 1);
      return {
        round: item.race.round,
        name: item.race.name,
        date: item.race.date,
        circuit: item.race.circuit.name,
        country: item.race.circuit.country,
        winner: raceWinner?.driver.name ?? null,
        pole: qualiPartial ? null : pole?.driver.name ?? null,
        fastestLap: lap?.driver.name ?? null,
      };
    }),
    progression: paint(full, bundle.driverStandings.map((row) => row.driver.id), 16, (_id, index) => driverColor(index)),
    progressionNote: progressionNote(bundle, full, "driver"),
    constructorProgression: paint(constructorFull, bundle.constructorStandings.map((row) => row.constructor.id), 10, (id, index) => constructorColor(id, index)),
    constructorProgressionNote: progressionNote(bundle, constructorFull, "constructor"),
    constructorBars: bundle.constructorStandings.slice(0, 8).map((row) => ({ label: row.constructor.name, value: row.points })),
    pace,
    paceNote: resultsPartial || qualiPartial
      ? "An incomplete qualifying or race feed is left blank here instead of being averaged."
      : "Average qualifying position against average classified finish. A higher number is a worse position. Missing bars mean that source had no positions.",
    movers: [...namedMoves.filter((move) => move.delta > 0).sort((a, b) => b.delta - a.delta || a.round - b.round).slice(0, 3), ...namedMoves.filter((move) => move.delta < 0).sort((a, b) => a.delta - b.delta || a.round - b.round).slice(0, 3)],
    moversNote: resultsPartial
      ? "Position changes are withheld because the race classification feed is incomplete."
      : moves.length
        ? "Grid position minus classified finish. Positive is places gained. Pit-lane starts and rows without a grid are excluded."
        : "No classified result included both a grid position and a finish.",
    statusLine,
    stats: [
      { label: "Driver leader", value: leader ? formatPoints(leader.points) : "—", detail: leader ? `${leader.driver.name} · ${leader.wins} standings wins` : "Standings have not been published" },
      { label: "Constructor leader", value: constructorLeader ? formatPoints(constructorLeader.points) : "—", detail: constructorLeader ? `${constructorLeader.constructor.name} · ${constructorLeader.wins} standings wins` : "Constructor standings have not been published" },
      { label: "Gap to second", value: leader && second ? formatPoints(leader.points - second.points) : "—", detail: second ? `${second.driver.name} is second` : "No second driver in the standings" },
      { label: "Leader wins", value: leader ? String(leader.wins) : "—", detail: "Wins on the published driver standings" },
      { label: "Podium results", value: podiums == null ? "—" : String(podiums), detail: podiums == null ? "Race classification incomplete" : "Classified grand prix results in P1–P3" },
      { label: "Classified rounds", value: `${completed.length}/${scheduleCount || "—"}`, detail: fastestLaps == null ? "Fastest-lap count withheld" : `${fastestLaps} fastest laps · ${poles == null ? "poles withheld" : `${poles} poles`}` },
    ],
    links: [
      { href: last ? racePath(bundle.season, last.race.round) : withSeason("/races", bundle.season), title: "Race analysis", detail: last ? `Open ${shortRace(last.race.name)}` : "Choose a grand prix" },
      { href: compareIds ? withSeason("/compare", bundle.season, { drivers: compareIds }) : withSeason("/compare", bundle.season), title: "Compare drivers", detail: bundle.driverStandings.length >= 2 ? "Start with the top two" : "Select drivers" },
      { href: withSeason("/standings", bundle.season), title: "Standings", detail: "Drivers and constructors" },
    ],
  };
}

export function buildCalendar(bundle: SeasonBundle, now = new Date()): CalendarModel {
  const completed = resultRounds(bundle.results);
  const qualiPartial = bundle.meta.partial.some((item) => item.includes("qualifying"));
  return {
    meta: bundle.meta,
    season: bundle.season,
    races: bundle.schedule.map((race) => {
      const winner = bundle.results.find((row) => row.round === race.round && row.position === 1 && classificationOf(row.status, row.positionText) === "classified");
      const pole = bundle.qualifying.find((row) => row.round === race.round && row.position === 1);
      return { ...race, phase: racePhase(race, completed.has(race.round), now), winner: winner?.driver.name ?? null, winnerId: winner?.driver.id ?? null, pole: qualiPartial ? null : pole?.driver.name ?? null };
    }),
  };
}

function driverRows(standings: DriverStanding[], bundle: SeasonBundle, previous: Map<string, number> | null): StandingRow[] {
  const resultsPartial = bundle.meta.partial.some((item) => item.includes("race results"));
  const qualiPartial = bundle.meta.partial.some((item) => item.includes("qualifying"));
  return standings.map((row) => ({
    position: row.position,
    delta: deltaFor(row.driver.id, row.position, previous),
    id: row.driver.id,
    name: row.driver.name,
    code: row.driver.code,
    number: row.driver.number,
    team: row.constructors[0]?.name ?? null,
    href: driverPath(bundle.season, row.driver.id),
    points: row.points,
    wins: row.wins,
    podiums: resultsPartial ? null : podiumCount(bundle.results, row.driver.id, "driver"),
    poles: qualiPartial ? null : poleCount(bundle.qualifying, row.driver.id),
    fastestLaps: resultsPartial ? null : new Set(bundle.results.filter((result) => result.driver.id === row.driver.id && result.fastestLapRank === 1).map((result) => result.round)).size,
    starts: resultsPartial ? null : new Set(bundle.results.filter((result) => result.driver.id === row.driver.id).map((result) => result.round)).size,
  }));
}

function constructorRows(standings: ConstructorStanding[], bundle: SeasonBundle, previous: Map<string, number> | null): StandingRow[] {
  const resultsPartial = bundle.meta.partial.some((item) => item.includes("race results"));
  return standings.map((row) => ({
    position: row.position,
    delta: deltaFor(row.constructor.id, row.position, previous),
    id: row.constructor.id,
    name: row.constructor.name,
    code: null,
    number: null,
    team: row.constructor.nationality,
    href: constructorPath(bundle.season, row.constructor.id),
    points: row.points,
    wins: row.wins,
    podiums: resultsPartial ? null : podiumCount(bundle.results, row.constructor.id, "constructor"),
    poles: null,
    fastestLaps: null,
    starts: null,
  }));
}

export function buildStandings(bundle: SeasonBundle, previousDrivers: DriverStanding[] | null, previousConstructors: ConstructorStanding[] | null): StandingsModel {
  const labels = roundLabels(bundle.schedule, bundle.results, bundle.sprints);
  const driverFull = buildProgression(labels, driverScores(bundle.results, bundle.sprints));
  const constructorFull = buildProgression(labels, constructorScores(bundle.results, bundle.sprints));
  return {
    meta: bundle.meta,
    season: bundle.season,
    showDelta: previousDrivers != null || previousConstructors != null,
    drivers: driverRows(bundle.driverStandings, bundle, previousDrivers ? new Map(previousDrivers.map((row) => [row.driver.id, row.position])) : null),
    constructors: constructorRows(bundle.constructorStandings, bundle, previousConstructors ? new Map(previousConstructors.map((row) => [row.constructor.id, row.position])) : null),
    driverProgression: paint(driverFull, bundle.driverStandings.map((row) => row.driver.id), 8, (_id, index) => driverColor(index)),
    constructorProgression: paint(constructorFull, bundle.constructorStandings.map((row) => row.constructor.id), 8, (id, index) => constructorColor(id, index)),
    progressionNote: progressionNote(bundle, driverFull, "driver"),
    constructorProgressionNote: progressionNote(bundle, constructorFull, "constructor"),
  };
}

export function buildDriverIndex(bundle: SeasonBundle) {
  return { meta: bundle.meta, season: bundle.season, rows: driverRows(bundle.driverStandings, bundle, null) };
}

export function buildConstructorIndex(bundle: SeasonBundle): ConstructorIndexModel {
  const labels = roundLabels(bundle.schedule, bundle.results, bundle.sprints);
  const full = buildProgression(labels, constructorScores(bundle.results, bundle.sprints));
  return {
    meta: bundle.meta,
    season: bundle.season,
    rows: constructorRows(bundle.constructorStandings, bundle, null),
    progression: paint(full, bundle.constructorStandings.map((row) => row.constructor.id), 8, (id, index) => constructorColor(id, index)),
    progressionNote: progressionNote(bundle, full, "constructor"),
  };
}

function careerSummary(rows: CareerRow[], error: string | null, limited: boolean, empty: string): string {
  if (error) return error;
  if (!rows.length) return empty;
  const years = rows.map((row) => row.season);
  const window = limited ? " Only the 16 most recent listed seasons are loaded, and a season is omitted if its standings request failed. This is not a complete career record." : "";
  return `Standings were returned for ${rows.length} seasons, from ${years[0]} to ${years[years.length - 1]}.${window} ${DEFINITIONS.careerPosition}`;
}

function directory(bundle: SeasonBundle) {
  const map = new Map<string, { id: string; name: string; code: string | null; position: number }>();
  for (const row of bundle.driverStandings) map.set(row.driver.id, { id: row.driver.id, name: row.driver.name, code: row.driver.code, position: row.position });
  for (const row of [...bundle.results, ...bundle.qualifying]) {
    if (!map.has(row.driver.id)) map.set(row.driver.id, { id: row.driver.id, name: row.driver.name, code: row.driver.code, position: 999 });
  }
  return [...map.values()].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)).map(({ id, name, code }) => ({ id, name, code }));
}

function entriesFor(driverId: string, bundle: SeasonBundle): HeadToHeadEntry[] {
  const quali = new Map(bundle.qualifying.filter((row) => row.driver.id === driverId).map((row) => [row.round, row.position]));
  return bundle.results.filter((row) => row.driver.id === driverId).map((row) => ({
    round: row.round,
    quali: quali.get(row.round) ?? null,
    finish: classificationOf(row.status, row.positionText) === "classified" ? row.position : null,
    classified: classificationOf(row.status, row.positionText) === "classified",
  }));
}

function teamFor(driverId: string, bundle: SeasonBundle) {
  const standing = bundle.driverStandings.find((row) => row.driver.id === driverId);
  if (standing?.constructors[0]) return standing.constructors[0];
  const counts = new Map<string, { team: ResultRow["constructor"]; count: number }>();
  for (const row of bundle.results) {
    if (row.driver.id !== driverId) continue;
    const current = counts.get(row.constructor.id);
    if (current) current.count += 1;
    else counts.set(row.constructor.id, { team: row.constructor, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)[0]?.team ?? null;
}

export function buildDriver(bundle: SeasonBundle, driverId: string, career: CareerRow[], careerError: string | null, careerLimited = false): DriverProfileModel | null {
  const person = bundle.driverStandings.find((row) => row.driver.id === driverId)?.driver ?? bundle.results.find((row) => row.driver.id === driverId)?.driver;
  if (!person) return null;
  const standing = bundle.driverStandings.find((row) => row.driver.id === driverId) ?? null;
  const team = teamFor(driverId, bundle);
  const stats = summarizeDriver(driverId, bundle.results, bundle.qualifying, bundle.sprints);
  const labels = roundLabels(bundle.schedule, bundle.results, bundle.sprints);
  const full = buildProgression(labels, driverScores(bundle.results, bundle.sprints));
  const teamRows = team ? [...bundle.results, ...bundle.sprints].filter((row) => row.constructor.id === team.id) : [];
  const shares = pointShares([...new Set(teamRows.map((row) => row.driver.id))].map((id) => ({
    id,
    points: teamRows.filter((row) => row.driver.id === id).reduce((sum, row) => sum + row.points, 0),
  })));
  const qualiByRound = new Map(bundle.qualifying.filter((row) => row.driver.id === driverId).map((row) => [row.round, row.position]));
  const sprintByRound = new Map(bundle.sprints.filter((row) => row.driver.id === driverId).map((row) => [row.round, row.positionText || row.status]));
  return {
    meta: bundle.meta,
    season: bundle.season,
    driver: person,
    team,
    standing: standing ? { position: standing.position, points: standing.points, wins: standing.wins } : null,
    stats,
    pointsLabel: standing ? "Championship points" : "Session points",
    pointsValue: standing ? standing.points : stats.points,
    pointsNote: standing && Math.abs(standing.points - stats.points) > 0.05 ? `Published standings list ${formatPoints(standing.points)} points. Race and sprint rows sum to ${formatPoints(stats.points)}.` : null,
    trend: trendLines(stats),
    progression: full.filter((series) => series.id === driverId).map((series) => ({ ...series, color: driverColor(0) })),
    rounds: labels.map((round) => {
      const race = bundle.results.find((row) => row.round === round.round && row.driver.id === driverId);
      return { round: round.round, label: round.label, finish: race && classificationOf(race.status, race.positionText) === "classified" ? race.position : null, quali: qualiByRound.get(round.round) ?? null, grid: race?.grid ?? null };
    }),
    distribution: finishBuckets(bundle.results.filter((row) => row.driver.id === driverId)),
    recent: bundle.results.filter((row) => row.driver.id === driverId).sort((a, b) => b.round - a.round).slice(0, 8).map((row) => ({
      round: row.round,
      name: row.raceName,
      date: row.date,
      grid: row.grid,
      quali: qualiByRound.get(row.round) ?? null,
      finish: classificationOf(row.status, row.positionText) === "classified" ? row.position : null,
      positionText: row.positionText || "—",
      status: row.status,
      points: row.points,
      sprintPosition: sprintByRound.get(row.round) ?? null,
      constructorName: row.constructor.name,
    })),
    teammates: shares.filter((row) => row.id !== driverId).flatMap((row) => {
      const teammate = bundle.driverStandings.find((item) => item.driver.id === row.id)?.driver ?? bundle.results.find((item) => item.driver.id === row.id)?.driver;
      if (!teammate) return [];
      const record = headToHead(entriesFor(driverId, bundle), entriesFor(row.id, bundle));
      return [{
        driver: teammate,
        raceCompared: record.raceCompared,
        raceAhead: record.raceA,
        raceBehind: record.raceB,
        qualiCompared: record.qualiCompared,
        qualiAhead: record.qualiA,
        qualiBehind: record.qualiB,
        sessionPoints: row.points,
        share: row.share,
        avgFinish: summarizeDriver(row.id, bundle.results, bundle.qualifying, bundle.sprints).avgFinish,
      }];
    }).slice(0, 3),
    teamSessionPoints: team ? teamRows.reduce((sum, row) => sum + row.points, 0) : null,
    driverTeamShare: shares.find((row) => row.id === driverId)?.share ?? null,
    career,
    careerNote: careerSummary(career, careerError, careerLimited, "No championship standings were returned for this driver."),
    directory: directory(bundle),
  };
}

export function buildConstructor(bundle: SeasonBundle, constructorId: string, career: CareerRow[], careerError: string | null, careerLimited = false): ConstructorProfileModel | null {
  const standing = bundle.constructorStandings.find((row) => row.constructor.id === constructorId) ?? null;
  const sample = [...bundle.results, ...bundle.sprints].find((row) => row.constructor.id === constructorId)?.constructor;
  const constructor = standing?.constructor ?? sample;
  if (!constructor) return null;
  const teamRows = [...bundle.results, ...bundle.sprints].filter((row) => row.constructor.id === constructorId);
  const raceRows = bundle.results.filter((row) => row.constructor.id === constructorId);
  const shares = pointShares([...new Set(teamRows.map((row) => row.driver.id))].map((id) => ({
    id,
    points: teamRows.filter((row) => row.driver.id === id).reduce((sum, row) => sum + row.points, 0),
  })));
  const labels = roundLabels(bundle.schedule, bundle.results, bundle.sprints);
  const full = buildProgression(labels, constructorScores(bundle.results, bundle.sprints));
  const sessionPoints = teamRows.reduce((sum, row) => sum + row.points, 0);
  return {
    meta: bundle.meta,
    season: bundle.season,
    constructor,
    standing: standing ? { position: standing.position, points: standing.points, wins: standing.wins } : null,
    lineup: shares.flatMap((share) => {
      const driver = bundle.driverStandings.find((row) => row.driver.id === share.id)?.driver ?? teamRows.find((row) => row.driver.id === share.id)?.driver;
      if (!driver) return [];
      return [{
        driver,
        href: driverPath(bundle.season, driver.id),
        championshipPoints: bundle.driverStandings.find((row) => row.driver.id === share.id)?.points ?? null,
        sessionPoints: share.points,
        share: share.share,
        wins: raceRows.filter((row) => row.driver.id === share.id && row.position === 1 && classificationOf(row.status, row.positionText) === "classified").length,
        podiums: podiumCount(raceRows.filter((row) => row.driver.id === share.id), share.id, "driver"),
      }];
    }).sort((a, b) => b.sessionPoints - a.sessionPoints),
    sessionPoints,
    wins: new Set(raceRows.filter((row) => row.position === 1 && classificationOf(row.status, row.positionText) === "classified").map((row) => row.round)).size,
    podiums: podiumCount(raceRows, constructorId, "constructor"),
    pointsNote: standing && Math.abs(standing.points - sessionPoints) > 0.05
      ? `Published constructor standings list ${formatPoints(standing.points)} points. Race and sprint rows for this constructor sum to ${formatPoints(sessionPoints)}.`
      : DEFINITIONS.teammateShare,
    progression: full.filter((series) => series.id === constructorId).map((series) => ({ ...series, color: constructorColor(constructorId) })),
    pointsByRound: labels.map((round) => ({ round: round.round, label: round.label, points: teamRows.filter((row) => row.round === round.round).reduce((sum, row) => sum + row.points, 0) })),
    career,
    careerNote: careerSummary(career, careerError, careerLimited, "No constructor standings history was returned."),
    directory: bundle.constructorStandings.map((row) => ({ id: row.constructor.id, name: row.constructor.name })),
  };
}

function metric(key: string, label: string, definition: string, values: (number | null)[], lowerBetter: boolean, comparable = true): CompareMetric {
  return { key, label, definition, values, lowerBetter, comparable };
}

export function buildComparison(bundle: SeasonBundle, driverIds: string[]): Omit<CompareModel, "lapSamples" | "lapNote" | "selectedRound"> {
  const drivers = driverIds.flatMap((id, index) => {
    const standing = bundle.driverStandings.find((row) => row.driver.id === id);
    const person = standing?.driver ?? bundle.results.find((row) => row.driver.id === id)?.driver ?? bundle.qualifying.find((row) => row.driver.id === id)?.driver;
    if (!person) return [];
    return [{
      driver: person,
      team: teamFor(id, bundle)?.name ?? null,
      color: driverColor(index),
      href: driverPath(bundle.season, id),
      stats: summarizeDriver(id, bundle.results, bundle.qualifying, bundle.sprints),
      officialPoints: standing?.points ?? null,
      officialWins: standing?.wins ?? null,
      position: standing?.position ?? null,
    }];
  });
  const qualiPartial = bundle.meta.partial.some((item) => item.includes("qualifying"));
  const labels = roundLabels(bundle.schedule, bundle.results, bundle.sprints);
  const full = buildProgression(labels, driverScores(bundle.results, bundle.sprints));
  return {
    meta: bundle.meta,
    season: bundle.season,
    drivers,
    directory: directory(bundle),
    metrics: [
      metric("points", "Championship points", "Points on the published driver standings. Session points are used only when a driver has no standings row.", drivers.map((driver) => driver.officialPoints ?? (driver.stats.starts ? driver.stats.points : null)), false),
      metric("wins", "Wins", DEFINITIONS.wins, drivers.map((driver) => driver.stats.wins), false),
      metric("podiums", "Podiums", DEFINITIONS.podiums, drivers.map((driver) => driver.stats.podiums), false),
      metric("poles", "Poles", DEFINITIONS.poles, drivers.map((driver) => (qualiPartial ? null : driver.stats.poles)), false),
      metric("fastest", "Fastest laps", DEFINITIONS.fastestLap, drivers.map((driver) => driver.stats.fastestLaps), false),
      metric("avgFinish", "Avg finish", DEFINITIONS.avgFinish, drivers.map((driver) => driver.stats.avgFinish), true),
      metric("avgQuali", "Avg qualifying", DEFINITIONS.avgQuali, drivers.map((driver) => (qualiPartial ? null : driver.stats.avgQuali)), true),
      metric("ppr", "Race points per start", "Grand prix points divided by race starts. Sprint points are excluded, and drivers with no starts stay blank.", drivers.map((driver) => driver.stats.pointsPerStart), false),
      metric("dnf", "DNF rate", DEFINITIONS.dnfRate, drivers.map((driver) => driver.stats.dnfRate), true),
      metric("finish", "Finish rate", DEFINITIONS.finishRate, drivers.map((driver) => driver.stats.finishRate), false),
      metric("consistency", "Finish spread", DEFINITIONS.consistency, drivers.map((driver) => driver.stats.consistency), true),
      metric("starts", "Starts", "Race classification rows for the driver.", drivers.map((driver) => driver.stats.starts), false, false),
    ],
    pairs: drivers.flatMap((left, index) => drivers.slice(index + 1).map((right) => {
      const record = headToHead(entriesFor(left.driver.id, bundle), entriesFor(right.driver.id, bundle));
      return { a: left.driver.name, b: right.driver.name, qualiA: record.qualiA, qualiB: record.qualiB, qualiTied: record.qualiTied, qualiCompared: record.qualiCompared, raceA: record.raceA, raceB: record.raceB, raceTied: record.raceTied, raceCompared: record.raceCompared };
    })),
    progression: drivers.flatMap((driver) => {
      const series = full.find((item) => item.id === driver.driver.id);
      return series ? [{ ...series, color: driver.color }] : [];
    }),
    progressionNote: progressionNote(bundle, full, "driver"),
    rounds: bundle.schedule.filter((race) => resultRounds(bundle.results).has(race.round)).map((race) => ({ round: race.round, name: race.name })),
  };
}

export function buildRaceIndex(bundle: SeasonBundle, now = new Date()): RaceIndexModel {
  const completed = resultRounds(bundle.results);
  const races = bundle.schedule.map((race) => {
    const winner = bundle.results.find((row) => row.round === race.round && row.position === 1 && classificationOf(row.status, row.positionText) === "classified");
    return { round: race.round, name: race.name, date: race.date, circuit: race.circuit.name, country: race.circuit.country, phase: racePhase(race, completed.has(race.round), now), winner: winner?.driver.name ?? null };
  });
  return { meta: bundle.meta, season: bundle.season, races, latestRound: [...races].reverse().find((race) => race.phase === "completed")?.round ?? null };
}

export function buildRaceDetail(input: {
  meta: SeasonBundle["meta"];
  schedule: ScheduledRace[];
  race: ScheduledRace;
  phase: RacePhase;
  results: ResultRow[];
  qualifying: QualiRow[];
  sprint: ResultRow[];
  pitstops: PitStop[];
  laps: LapTiming[];
  lapError: string | null;
  pitError: string | null;
}): RaceDetailModel {
  const names = new Map<string, { name: string; code: string | null; number: string | null; constructorId: string; constructorName: string }>();
  for (const row of [...input.results, ...input.sprint, ...input.qualifying]) {
    names.set(row.driver.id, { name: row.driver.name, code: row.driver.code, number: row.driver.number, constructorId: row.constructor.id, constructorName: row.constructor.name });
  }
  const pitstops = input.pitstops.map((pit) => ({ ...pit, driverName: names.get(pit.driverId)?.name ?? pit.driverId, constructorName: names.get(pit.driverId)?.constructorName ?? "—" }));
  const completed = input.phase === "completed";
  return {
    meta: input.meta,
    season: input.race.season,
    round: input.race.round,
    race: input.race,
    phase: input.phase,
    results: [...input.results].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    qualifying: [...input.qualifying].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    sprint: [...input.sprint].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)),
    pitstops,
    laps: input.laps.map((lap) => ({ lap: lap.lap, driverId: lap.driverId, position: lap.position, seconds: lap.seconds })),
    drivers: [...names.entries()].map(([id, value]) => ({ id, ...value })),
    insights: raceInsights(input.results, input.qualifying, pitstops),
    lapNote: input.laps.length ? null : completed ? input.lapError ?? "Lap times were not returned for this round." : "Lap times are published after the race.",
    pitNote: input.pitstops.length ? null : completed ? input.pitError ?? "Pit stops were not returned for this round." : "Pit stops are published after the race.",
    rounds: input.schedule.map((race) => ({ round: race.round, name: race.name })),
  };
}

export function buildCircuit(input: { meta: SeasonBundle["meta"]; circuit: CircuitModel["circuit"]; winners: ResultRow[]; truncated: boolean; seasonEvent: CircuitModel["seasonEvent"] }): CircuitModel {
  const counts = new Map<string, { driver: string; driverId: string; wins: number }>();
  for (const winner of input.winners) {
    const current = counts.get(winner.driver.id);
    if (current) current.wins += 1;
    else counts.set(winner.driver.id, { driver: winner.driver.name, driverId: winner.driver.id, wins: 1 });
  }
  return {
    meta: input.meta,
    circuit: input.circuit,
    winners: [...input.winners].sort((a, b) => b.season - a.season || b.round - a.round).map((row) => ({
      season: row.season,
      round: row.round,
      name: row.raceName,
      date: row.date,
      driver: row.driver.name,
      driverId: row.driver.id,
      constructorName: row.constructor.name,
      constructorId: row.constructor.id,
    })),
    mostSuccessful: [...counts.values()].sort((a, b) => b.wins - a.wins || a.driver.localeCompare(b.driver)).slice(0, 5),
    truncated: input.truncated,
    seasonEvent: input.seasonEvent,
  };
}

export function buildHistory(input: { from: number; to: number; currentSeason: number; inProgress: boolean; failed: string[]; drivers: SeasonBattle[]; constructors: SeasonBattle[]; fetchedAt: string | null; stale: boolean }): HistoryModel {
  return {
    meta: { source: "Jolpica-F1", sourceLabel: "Jolpica-F1 standings", fetchedAt: input.fetchedAt, stale: input.stale, partial: input.failed, season: input.currentSeason, standingsRound: null },
    from: input.from,
    to: input.to,
    currentSeason: input.currentSeason,
    inProgress: input.inProgress,
    failed: input.failed,
    drivers: input.drivers,
    constructors: input.constructors,
  };
}

export function historyLeaders(rows: SeasonBattle[]) {
  return { closest: closestBattles(rows).slice(0, 5), dominant: dominantBattles(rows).slice(0, 5), winRate: highestWinRates(rows) };
}

export function buildBrief(input: { season: number; schedule: ScheduledRace[]; drivers: DriverStanding[]; constructors: ConstructorStanding[]; fetchedAt: string | null; stale: boolean; partial: string[]; standingsRound: number | null; now?: Date }): BriefModel {
  const now = input.now ?? new Date();
  const next = input.schedule.find((race) => racePhase(race, false, now) === "upcoming") ?? null;
  const leader = input.drivers[0];
  const second = input.drivers[1];
  const constructorLeader = input.constructors[0];
  const constructorSecond = input.constructors[1];
  return {
    season: input.season,
    roundsScheduled: input.schedule.length,
    standingsRound: input.standingsRound,
    fetchedAt: input.fetchedAt,
    stale: input.stale,
    leader: leader ? { name: leader.driver.name, points: leader.points, wins: leader.wins } : null,
    gap: leader && second ? leader.points - second.points : null,
    constructorLeader: constructorLeader ? { name: constructorLeader.constructor.name, points: constructorLeader.points } : null,
    constructorGap: constructorLeader && constructorSecond ? constructorLeader.points - constructorSecond.points : null,
    nextRace: next ? { name: next.name, round: next.round, date: next.date } : null,
    partial: input.partial,
  };
}

export function buildSearch(bundle: SeasonBundle, query: string): SearchModel {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return { season: bundle.season, drivers: [], constructors: [], races: [] };
  return {
    season: bundle.season,
    drivers: directory(bundle).filter((driver) => `${driver.name} ${driver.code ?? ""} ${driver.id}`.toLowerCase().includes(needle)).slice(0, 6).map((driver) => ({ href: driverPath(bundle.season, driver.id), label: driver.name, detail: driver.code ?? "Driver" })),
    constructors: bundle.constructorStandings.filter((row) => `${row.constructor.name} ${row.constructor.id}`.toLowerCase().includes(needle)).slice(0, 5).map((row) => ({ href: constructorPath(bundle.season, row.constructor.id), label: row.constructor.name, detail: "Constructor" })),
    races: bundle.schedule.filter((race) => `${race.name} ${race.circuit.name} ${race.circuit.country ?? ""} ${race.circuit.locality ?? ""}`.toLowerCase().includes(needle)).slice(0, 6).map((race) => ({ href: racePath(bundle.season, race.round), label: race.name, detail: race.circuit.locality ?? race.circuit.name })),
  };
}
