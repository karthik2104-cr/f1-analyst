import "server-only";

import { DataError, errorMessage, isNotFound } from "./errors";
import { clearCache, getCacheInfo, type CacheInfo } from "./http";
import {
  fetchCircuitWinners,
  fetchCircuits,
  fetchConstructorCareer,
  fetchConstructorStandings,
  fetchDriverCareer,
  fetchDriverStandings,
  fetchLapTimes,
  fetchPitStops,
  fetchRoundConstructorStandings,
  fetchRoundDriverStandings,
  fetchRoundQualifying,
  fetchRoundResults,
  fetchRoundSprints,
  fetchSchedule,
  fetchSeasonQualifying,
  fetchSeasonResults,
  fetchSeasonSprints,
  fetchSeasons,
  oldestFetch,
  type Fetched,
} from "./jolpica";
import type { BriefModel, CircuitIndexModel, CircuitModel, CompareModel, DriverProfileModel, HistoryModel, RaceDetailModel, SearchModel } from "./models";
import { mapPool } from "./pool";
import {
  buildBrief,
  buildCalendar,
  buildCircuit,
  buildComparison,
  buildConstructor,
  buildConstructorIndex,
  buildDriver,
  buildDriverIndex,
  buildHistory,
  buildOverview,
  buildRaceDetail,
  buildRaceIndex,
  buildSearch,
  buildStandings,
} from "./present";
import { racePhase, seasonIsComplete } from "./schedule";
import { TTL, ttlForSeason } from "./ttl";
import type { DataMeta, ResultRow, ScheduledRace, SeasonBundle } from "./types";
import type { SeasonBattle } from "./analytics";

const SLUG = /^[a-z0-9_]{1,80}$/i;
const bundles = new Map<string, Promise<SeasonBundle>>();

export function assertSlug(value: string, label: string): void {
  if (!SLUG.test(value)) throw new DataError(`Invalid ${label}.`);
}

export function assertRound(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 40) throw new DataError("Round is out of range.");
}

function assertSeason(input: string): void {
  if (input === "current") return;
  if (!/^\d{4}$/.test(input)) throw new DataError("Season must be a four-digit year.");
  const year = Number(input);
  if (year < 1950 || year > 2100) throw new DataError("Season is outside the supported range.");
}

type Optional<T> = { ok: true; value: T; label: string } | { ok: false; label: string; quiet: boolean; message: string };

async function optional<T>(label: string, fn: () => Promise<T>): Promise<Optional<T>> {
  try {
    return { ok: true, value: await fn(), label };
  } catch (error) {
    return { ok: false, label, quiet: isNotFound(error), message: errorMessage(error) };
  }
}

function metaFrom(parts: { fetchedAt: string | null; stale: boolean }[], partial: string[], season: number | null, standingsRound: number | null): DataMeta {
  const timing = oldestFetch(parts);
  return {
    source: "Jolpica-F1",
    sourceLabel: "Jolpica-F1 Ergast-compatible API",
    fetchedAt: timing.fetchedAt,
    stale: timing.stale,
    partial,
    season,
    standingsRound,
  };
}

async function loadBundle(seasonInput: string): Promise<SeasonBundle> {
  assertSeason(seasonInput);
  const key = seasonInput || "current";
  const existing = bundles.get(key);
  if (existing) return existing;
  const promise = createBundle(key).finally(() => {
    if (bundles.get(key) === promise) bundles.delete(key);
  });
  bundles.set(key, promise);
  return promise;
}

async function createBundle(seasonInput: string): Promise<SeasonBundle> {
  const scheduleTtl = seasonInput === "current" || Number(seasonInput) >= new Date().getUTCFullYear() ? TTL.scheduleCurrent : TTL.schedulePast;
  let schedule: Fetched<ScheduledRace[]>;
  try {
    schedule = await fetchSchedule(seasonInput, scheduleTtl);
  } catch (error) {
    throw new DataError(error instanceof DataError ? error.message : "The season schedule could not be loaded from Jolpica.");
  }
  const season = schedule.data[0]?.season ?? (seasonInput !== "current" ? Number(seasonInput) : NaN);
  if (!Number.isInteger(season)) throw new DataError("Jolpica did not return a schedule for that season.");
  const live = season >= new Date().getUTCFullYear();
  const standingsTtl = live ? TTL.standingsCurrent : TTL.standingsPast;
  const resultsTtl = live ? TTL.resultsCurrent : TTL.resultsPast;
  const [drivers, constructors, results, qualifying, sprints] = await Promise.all([
    optional("driver standings", () => fetchDriverStandings(season, standingsTtl)),
    optional("constructor standings", () => fetchConstructorStandings(season, standingsTtl)),
    optional("race results", () => fetchSeasonResults(season, resultsTtl)),
    optional("qualifying", () => fetchSeasonQualifying(season, resultsTtl)),
    optional("sprint results", () => fetchSeasonSprints(season, resultsTtl)),
  ]);
  const partial = [drivers, constructors, results, qualifying, sprints].flatMap((item) => (item.ok || item.quiet ? [] : [`${item.label}: ${item.message}`]));
  for (const item of [results, qualifying, sprints]) {
    if (item.ok && item.value.truncated) partial.push(`${item.label} were truncated by the pagination safety cap`);
  }
  const parts = [schedule, ...[drivers, constructors, results, qualifying, sprints].flatMap((item) => (item.ok ? [item.value] : []))];
  return {
    season,
    schedule: schedule.data,
    driverStandings: drivers.ok ? drivers.value.data.rows : [],
    constructorStandings: constructors.ok ? constructors.value.data.rows : [],
    results: results.ok ? results.value.data : [],
    qualifying: qualifying.ok ? qualifying.value.data : [],
    sprints: sprints.ok ? sprints.value.data : [],
    meta: metaFrom(parts, partial, season, drivers.ok ? drivers.value.data.round : constructors.ok ? constructors.value.data.round : null),
  };
}

export async function getSeasons() {
  const fetched = await fetchSeasons(TTL.seasons);
  return { seasons: fetched.data, fetchedAt: fetched.fetchedAt, stale: fetched.stale };
}

export async function getBrief(seasonInput: string): Promise<BriefModel> {
  assertSeason(seasonInput);
  const scheduleTtl = seasonInput === "current" || Number(seasonInput) >= new Date().getUTCFullYear() ? TTL.scheduleCurrent : TTL.schedulePast;
  const schedule = await fetchSchedule(seasonInput, scheduleTtl);
  const season = schedule.data[0]?.season ?? Number(seasonInput);
  if (!Number.isInteger(season)) throw new DataError("Jolpica did not return a schedule for that season.");
  const standingsTtl = ttlForSeason(season, new Date().getUTCFullYear(), TTL.standingsCurrent, TTL.standingsPast);
  const [drivers, constructors] = await Promise.all([
    optional("driver standings", () => fetchDriverStandings(season, standingsTtl)),
    optional("constructor standings", () => fetchConstructorStandings(season, standingsTtl)),
  ]);
  const partial = [drivers, constructors].flatMap((item) => (item.ok || item.quiet ? [] : [item.label]));
  const timing = oldestFetch([schedule, ...[drivers, constructors].flatMap((item) => (item.ok ? [item.value] : []))]);
  return buildBrief({
    season,
    schedule: schedule.data,
    drivers: drivers.ok ? drivers.value.data.rows : [],
    constructors: constructors.ok ? constructors.value.data.rows : [],
    fetchedAt: timing.fetchedAt,
    stale: timing.stale,
    partial,
    standingsRound: drivers.ok ? drivers.value.data.round : null,
  });
}

export async function getOverview(seasonInput: string) {
  return buildOverview(await loadBundle(seasonInput));
}

export async function getCalendar(seasonInput: string) {
  return buildCalendar(await loadBundle(seasonInput));
}

export async function getStandings(seasonInput: string) {
  const bundle = await loadBundle(seasonInput);
  const round = bundle.meta.standingsRound;
  const ttl = ttlForSeason(bundle.season, new Date().getUTCFullYear(), TTL.standingsCurrent, TTL.standingsPast);
  const [previousDrivers, previousConstructors] = round && round > 1
    ? await Promise.all([
        optional("previous driver standings", () => fetchRoundDriverStandings(bundle.season, round - 1, ttl)),
        optional("previous constructor standings", () => fetchRoundConstructorStandings(bundle.season, round - 1, ttl)),
      ])
    : [null, null];
  const extraPartial = [previousDrivers, previousConstructors].flatMap((item) => (item && !item.ok && !item.quiet ? [item.label] : []));
  return buildStandings(
    extraPartial.length ? { ...bundle, meta: { ...bundle.meta, partial: [...bundle.meta.partial, ...extraPartial] } } : bundle,
    previousDrivers?.ok ? previousDrivers.value.data.rows : null,
    previousConstructors?.ok ? previousConstructors.value.data.rows : null,
  );
}

export async function getDriverIndex(seasonInput: string) {
  return buildDriverIndex(await loadBundle(seasonInput));
}

export async function getDriverProfile(seasonInput: string, driverId: string): Promise<DriverProfileModel | null> {
  assertSlug(driverId, "driver");
  const bundle = await loadBundle(seasonInput);
  const career = await optional("career standings", () => fetchDriverCareer(driverId, TTL.career));
  return buildDriver(bundle, driverId, career.ok ? career.value.data : [], career.ok || career.quiet ? null : career.message, Boolean(career.ok && career.value.truncated));
}

export async function getConstructorIndex(seasonInput: string) {
  return buildConstructorIndex(await loadBundle(seasonInput));
}

export async function getConstructorProfile(seasonInput: string, constructorId: string) {
  assertSlug(constructorId, "constructor");
  const bundle = await loadBundle(seasonInput);
  const career = await optional("constructor history", () => fetchConstructorCareer(constructorId, TTL.career));
  return buildConstructor(bundle, constructorId, career.ok ? career.value.data : [], career.ok || career.quiet ? null : career.message, Boolean(career.ok && career.value.truncated));
}

export async function getComparison(seasonInput: string, driverIds: string[], round: number | null): Promise<CompareModel> {
  const ids = [...new Set(driverIds.filter((id) => SLUG.test(id)))].slice(0, 4);
  const bundle = await loadBundle(seasonInput);
  const base = buildComparison(bundle, ids);
  if (round == null) return { ...base, selectedRound: null, lapSamples: null, lapNote: "Select a classified round to compare median lap times. Sector times are not in this dataset." };
  assertRound(round);
  if (!bundle.schedule.some((race) => race.round === round)) {
    return { ...base, selectedRound: round, lapSamples: null, lapNote: "That round is not on the selected season calendar." };
  }
  const laps = await optional("lap times", () => fetchLapTimes(bundle.season, round, TTL.laps));
  if (!laps.ok) return { ...base, selectedRound: round, lapSamples: null, lapNote: laps.quiet ? "Lap times were not returned for this round." : laps.message };
  const selected = new Set(base.drivers.map((driver) => driver.driver.id));
  const samples = base.drivers.map((driver) => ({
    driverId: driver.driver.id,
    name: driver.driver.name,
    seconds: laps.value.data.flatMap((lap) => (lap.driverId === driver.driver.id && lap.seconds != null ? [lap.seconds] : [])),
  }));
  return {
    ...base,
    selectedRound: round,
    lapSamples: samples.filter((sample) => selected.has(sample.driverId)),
    lapNote: laps.value.data.length ? null : "Lap times were not returned for this round.",
  };
}

export async function getRaceIndex(seasonInput: string) {
  return buildRaceIndex(await loadBundle(seasonInput));
}

export async function getRaceDetail(seasonInput: string, round: number): Promise<RaceDetailModel | null> {
  assertRound(round);
  assertSeason(seasonInput);
  const scheduleTtl = seasonInput === "current" || Number(seasonInput) >= new Date().getUTCFullYear() ? TTL.scheduleCurrent : TTL.schedulePast;
  const schedule = await fetchSchedule(seasonInput, scheduleTtl);
  const season = schedule.data[0]?.season ?? Number(seasonInput);
  const race = schedule.data.find((item) => item.round === round);
  if (!race || !Number.isInteger(season)) return null;
  const resultsTtl = ttlForSeason(season, new Date().getUTCFullYear(), TTL.resultsCurrent, TTL.resultsPast);
  const [results, qualifying, sprint, pits, laps] = await Promise.all([
    optional("race results", () => fetchRoundResults(season, round, resultsTtl)),
    optional("qualifying", () => fetchRoundQualifying(season, round, resultsTtl)),
    optional("sprint results", () => fetchRoundSprints(season, round, resultsTtl)),
    optional("pit stops", () => fetchPitStops(season, round, TTL.laps)),
    optional("lap times", () => fetchLapTimes(season, round, TTL.laps)),
  ]);
  const partial = [results, qualifying, sprint, pits, laps].flatMap((item) => (item.ok || item.quiet ? [] : [`${item.label}: ${item.message}`]));
  const timing = oldestFetch([schedule, ...[results, qualifying, sprint, pits, laps].flatMap((item) => (item.ok ? [item.value] : []))]);
  const raceResults: ResultRow[] = results.ok ? results.value.data : [];
  const phase = racePhase(race, raceResults.length > 0, new Date());
  return buildRaceDetail({
    meta: { ...metaFrom([timing], partial, season, null), fetchedAt: timing.fetchedAt, stale: timing.stale },
    schedule: schedule.data,
    race,
    phase,
    results: raceResults,
    qualifying: qualifying.ok ? qualifying.value.data : [],
    sprint: sprint.ok ? sprint.value.data : [],
    pitstops: pits.ok ? pits.value.data : [],
    laps: laps.ok ? laps.value.data : [],
    lapError: laps.ok || laps.quiet ? null : laps.message,
    pitError: pits.ok || pits.quiet ? null : pits.message,
  });
}

export async function getCircuits(): Promise<CircuitIndexModel> {
  const fetched = await fetchCircuits(TTL.circuits);
  return {
    meta: metaFrom([fetched], fetched.truncated ? ["Circuit list was truncated by the pagination safety cap"] : [], null, null),
    circuits: fetched.data,
  };
}

export async function getCircuit(circuitId: string, seasonInput: string): Promise<CircuitModel | null> {
  assertSlug(circuitId, "circuit");
  assertSeason(seasonInput);
  const [circuits, winners, schedule] = await Promise.all([
    fetchCircuits(TTL.circuits),
    optional("circuit winners", () => fetchCircuitWinners(circuitId, TTL.circuits)),
    optional("season schedule", () => fetchSchedule(seasonInput, seasonInput === "current" || Number(seasonInput) >= new Date().getUTCFullYear() ? TTL.scheduleCurrent : TTL.schedulePast)),
  ]);
  const circuit = circuits.data.find((item) => item.id === circuitId);
  if (!circuit) return null;
  if (!winners.ok && !winners.quiet) throw new DataError(winners.message);
  const season = schedule.ok ? schedule.value.data[0]?.season ?? null : null;
  const event = schedule.ok ? schedule.value.data.find((race) => race.circuit.id === circuitId) ?? null : null;
  const eventHasResult = Boolean(event && winners.ok && winners.value.data.some((row) => row.season === event.season && row.round === event.round));
  const partial = winners.ok ? [] : ["Winning results were not returned for this circuit."];
  return buildCircuit({
    meta: metaFrom([circuits, ...[winners, schedule].flatMap((item) => (item.ok ? [item.value] : []))], partial, season, null),
    circuit,
    winners: winners.ok ? winners.value.data : [],
    truncated: winners.ok ? winners.value.truncated : false,
    seasonEvent: event ? { season: event.season, round: event.round, name: event.name, date: event.date, phase: racePhase(event, eventHasResult, new Date()) } : null,
  });
}

function battleFromDrivers(season: number, rows: { position: number; points: number; wins: number; driver: { id: string; name: string } }[], round: number | null, inProgress: boolean): SeasonBattle | null {
  if (!rows.length) return null;
  const [leader, second] = rows;
  return {
    season,
    inProgress,
    leader: leader.driver.name,
    leaderId: leader.driver.id,
    leaderPoints: leader.points,
    leaderWins: leader.wins,
    second: second?.driver.name ?? null,
    secondId: second?.driver.id ?? null,
    secondPoints: second?.points ?? null,
    gap: second ? leader.points - second.points : null,
    rounds: round,
  };
}

export async function getHistory(from: number | null, to: number | null): Promise<HistoryModel> {
  const currentSchedule = await fetchSchedule("current", TTL.scheduleCurrent);
  const currentSeason = currentSchedule.data[0]?.season;
  if (!currentSeason) throw new DataError("The current season could not be resolved.");
  const end = Math.min(to ?? currentSeason, currentSeason);
  const start = Math.min(from ?? Math.min(2014, end), end);
  if (start < 1950 || end > 2100) throw new DataError("Season year is out of range.");
  if (end - start > 29) throw new DataError("History can load up to 30 seasons at a time. Narrow the year range.");
  const years = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const rows = await mapPool(years, 4, async (year) => {
    const ttl = ttlForSeason(year, currentSeason, TTL.standingsCurrent, TTL.standingsPast);
    const [drivers, constructors] = await Promise.all([
      optional(`${year} driver standings`, () => fetchDriverStandings(year, ttl)),
      optional(`${year} constructor standings`, () => fetchConstructorStandings(year, ttl)),
    ]);
    return { year, drivers, constructors };
  });
  const currentRow = rows.find((row) => row.year === currentSeason);
  const standingsRound = currentRow?.drivers.ok ? currentRow.drivers.value.data.round : null;
  const hasFuture = currentSchedule.data.some((race) => racePhase(race, false, new Date()) === "upcoming");
  const complete = seasonIsComplete({ scheduledRounds: currentSchedule.data.length, standingsRound, upcoming: hasFuture });
  const failed: string[] = [];
  const drivers: SeasonBattle[] = [];
  const constructors: SeasonBattle[] = [];
  const fetches: { fetchedAt: string | null; stale: boolean }[] = [currentSchedule];
  for (const row of rows) {
    const inProgress = row.year === currentSeason && !complete;
    if (row.drivers.ok) {
      fetches.push(row.drivers.value);
      const battle = battleFromDrivers(row.year, row.drivers.value.data.rows, row.drivers.value.data.round, inProgress);
      if (battle) drivers.push(battle);
    } else if (!row.drivers.quiet) failed.push(row.drivers.message);
    if (row.constructors.ok) {
      fetches.push(row.constructors.value);
      const list = row.constructors.value.data.rows;
      if (list.length) {
        const [leader, second] = list;
        constructors.push({
          season: row.year,
          inProgress,
          leader: leader.constructor.name,
          leaderId: leader.constructor.id,
          leaderPoints: leader.points,
          leaderWins: leader.wins,
          second: second?.constructor.name ?? null,
          secondId: second?.constructor.id ?? null,
          secondPoints: second?.points ?? null,
          gap: second ? leader.points - second.points : null,
          rounds: row.constructors.value.data.round,
        });
      }
    } else if (!row.constructors.quiet) failed.push(row.constructors.message);
  }
  const timing = oldestFetch(fetches);
  return buildHistory({ from: start, to: end, currentSeason, inProgress: !complete, failed, drivers, constructors, fetchedAt: timing.fetchedAt, stale: timing.stale });
}

export async function searchSeason(seasonInput: string, query: string): Promise<SearchModel> {
  return buildSearch(await loadBundle(seasonInput), query);
}

export async function cacheStatus(): Promise<CacheInfo> {
  return getCacheInfo();
}

export async function clearDataCache(): Promise<void> {
  await clearCache();
}
