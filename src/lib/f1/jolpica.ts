import "server-only";

import { DataError, errorMessage } from "./errors";
import { getJson } from "./http";
import { mapPool } from "./pool";
import {
  constructorCareerFromLists,
  constructorStandingsFromLists,
  driverCareerFromLists,
  driverStandingsFromLists,
  lapsFromRace,
  mergeRaces,
  mergeStandingsLists,
  pitsFromRace,
  qualiFromRaces,
  resultsFromRaces,
  toCircuit,
  toScheduledRace,
} from "./normalize";
import type { JolpicaPayload, RawRace, RawStandingsList } from "./raw";
import type { CareerRow, Circuit, LapTiming, PitStop, QualiRow, ResultRow, ScheduledRace } from "./types";

export type Fetched<T> = {
  data: T;
  fetchedAt: string;
  stale: boolean;
  truncated: boolean;
};

const PAGE_CAP = 40;
const CAREER_SEASON_CAP = 16;

function withPage(resource: string, limit: number, offset: number): string {
  const join = resource.includes("?") ? "&" : "?";
  return `${resource}${join}limit=${limit}&offset=${offset}`;
}

async function getPages(resource: string, ttl: number): Promise<{ pages: JolpicaPayload[]; fetchedAt: string; stale: boolean; truncated: boolean }> {
  const first = await getJson<JolpicaPayload>(withPage(resource, 100, 0), ttl);
  const total = Number(first.data.MRData.total ?? 0);
  const pages = [first.data];
  let stale = first.stale;
  let fetchedAt = first.fetchedAt;
  const pageCount = Math.min(PAGE_CAP, Math.max(1, Math.ceil((Number.isFinite(total) ? total : 0) / 100)));
  for (let page = 1; page < pageCount; page += 1) {
    const next = await getJson<JolpicaPayload>(withPage(resource, 100, page * 100), ttl);
    pages.push(next.data);
    stale = stale || next.stale;
    if (next.fetchedAt > fetchedAt) fetchedAt = next.fetchedAt;
    const races = next.data.MRData.RaceTable?.Races?.length ?? 0;
    const lists = next.data.MRData.StandingsTable?.StandingsLists?.length ?? 0;
    const circuits = next.data.MRData.CircuitTable?.Circuits?.length ?? 0;
    const seasons = next.data.MRData.SeasonTable?.Seasons?.length ?? 0;
    if (races + lists + circuits + seasons === 0) break;
  }
  return { pages, fetchedAt, stale, truncated: Number.isFinite(total) && total > PAGE_CAP * 100 };
}

export async function fetchSchedule(seasonKey: string, ttl: number): Promise<Fetched<ScheduledRace[]>> {
  const resource = seasonKey === "current" ? "current.json" : `${seasonKey}.json`;
  const paged = await getPages(resource, ttl);
  const races = mergeRaces(paged.pages.flatMap((page) => page.MRData.RaceTable?.Races ?? []))
    .flatMap((race) => {
      const scheduled = toScheduledRace(race);
      return scheduled ? [scheduled] : [];
    })
    .sort((a, b) => a.round - b.round);
  return { data: races, fetchedAt: paged.fetchedAt, stale: paged.stale, truncated: paged.truncated };
}

async function fetchMergedRaces(resource: string, ttl: number): Promise<Fetched<RawRace[]>> {
  const paged = await getPages(resource, ttl);
  return {
    data: mergeRaces(paged.pages.flatMap((page) => page.MRData.RaceTable?.Races ?? [])),
    fetchedAt: paged.fetchedAt,
    stale: paged.stale,
    truncated: paged.truncated,
  };
}

export async function fetchSeasonResults(season: number, ttl: number): Promise<Fetched<ResultRow[]>> {
  const fetched = await fetchMergedRaces(`${season}/results.json`, ttl);
  return { ...fetched, data: resultsFromRaces(fetched.data, "race") };
}

export async function fetchSeasonQualifying(season: number, ttl: number): Promise<Fetched<QualiRow[]>> {
  const fetched = await fetchMergedRaces(`${season}/qualifying.json`, ttl);
  return { ...fetched, data: qualiFromRaces(fetched.data) };
}

export async function fetchSeasonSprints(season: number, ttl: number): Promise<Fetched<ResultRow[]>> {
  const fetched = await fetchMergedRaces(`${season}/sprint.json`, ttl);
  return { ...fetched, data: resultsFromRaces(fetched.data, "sprint") };
}

export async function fetchRoundResults(season: number, round: number, ttl: number): Promise<Fetched<ResultRow[]>> {
  const fetched = await fetchMergedRaces(`${season}/${round}/results.json`, ttl);
  return { ...fetched, data: resultsFromRaces(fetched.data, "race") };
}

export async function fetchRoundQualifying(season: number, round: number, ttl: number): Promise<Fetched<QualiRow[]>> {
  const fetched = await fetchMergedRaces(`${season}/${round}/qualifying.json`, ttl);
  return { ...fetched, data: qualiFromRaces(fetched.data) };
}

export async function fetchRoundSprints(season: number, round: number, ttl: number): Promise<Fetched<ResultRow[]>> {
  const fetched = await fetchMergedRaces(`${season}/${round}/sprint.json`, ttl);
  return { ...fetched, data: resultsFromRaces(fetched.data, "sprint") };
}

export async function fetchPitStops(season: number, round: number, ttl: number): Promise<Fetched<PitStop[]>> {
  const fetched = await fetchMergedRaces(`${season}/${round}/pitstops.json`, ttl);
  return { ...fetched, data: fetched.data.flatMap(pitsFromRace) };
}

export async function fetchLapTimes(season: number, round: number, ttl: number): Promise<Fetched<LapTiming[]>> {
  const fetched = await fetchMergedRaces(`${season}/${round}/laps.json`, ttl);
  return { ...fetched, data: fetched.data.flatMap(lapsFromRace) };
}

async function fetchLists(resource: string, ttl: number): Promise<Fetched<RawStandingsList[]>> {
  const paged = await getPages(resource, ttl);
  return {
    data: mergeStandingsLists(paged.pages.flatMap((page) => page.MRData.StandingsTable?.StandingsLists ?? [])),
    fetchedAt: paged.fetchedAt,
    stale: paged.stale,
    truncated: paged.truncated,
  };
}

export async function fetchDriverStandings(season: number, ttl: number): Promise<Fetched<ReturnType<typeof driverStandingsFromLists>>> {
  const fetched = await fetchLists(`${season}/driverstandings.json`, ttl);
  return { ...fetched, data: driverStandingsFromLists(fetched.data) };
}

export async function fetchConstructorStandings(
  season: number,
  ttl: number,
): Promise<Fetched<ReturnType<typeof constructorStandingsFromLists>>> {
  const fetched = await fetchLists(`${season}/constructorstandings.json`, ttl);
  return { ...fetched, data: constructorStandingsFromLists(fetched.data) };
}

export async function fetchRoundDriverStandings(season: number, round: number, ttl: number) {
  return fetchDriverStandingsPath(`${season}/${round}/driverstandings.json`, ttl);
}

export async function fetchRoundConstructorStandings(season: number, round: number, ttl: number) {
  const fetched = await fetchLists(`${season}/${round}/constructorstandings.json`, ttl);
  return { ...fetched, data: constructorStandingsFromLists(fetched.data) };
}

async function fetchDriverStandingsPath(resource: string, ttl: number) {
  const fetched = await fetchLists(resource, ttl);
  return { ...fetched, data: driverStandingsFromLists(fetched.data) };
}

async function fetchYears(resource: string, ttl: number): Promise<Fetched<number[]>> {
  const paged = await getPages(resource, ttl);
  const years = paged.pages.flatMap((page) => page.MRData.SeasonTable?.Seasons ?? []).flatMap((season) => {
    const year = Number(season.season);
    return Number.isInteger(year) ? [year] : [];
  });
  return {
    data: [...new Set(years)].sort((a, b) => a - b),
    fetchedAt: paged.fetchedAt,
    stale: paged.stale,
    truncated: paged.truncated,
  };
}

async function fetchCareer(
  yearsResource: string,
  standingsPath: (year: number) => string,
  ttl: number,
  toRows: (lists: RawStandingsList[]) => CareerRow[],
): Promise<Fetched<CareerRow[]>> {
  const seasons = await fetchYears(yearsResource, ttl);
  const selected = seasons.data.slice(-CAREER_SEASON_CAP);
  const limited = seasons.truncated || seasons.data.length > selected.length;
  if (!selected.length) return { data: [], fetchedAt: seasons.fetchedAt, stale: seasons.stale, truncated: limited };
  const parts = await mapPool(selected, 4, async (year) => {
    try {
      return { ok: true as const, value: await fetchLists(standingsPath(year), ttl) };
    } catch (error) {
      return { ok: false as const, message: errorMessage(error) };
    }
  });
  const loaded = parts.flatMap((part) => (part.ok ? [part.value] : []));
  const failed = parts.flatMap((part) => (part.ok ? [] : [part.message]));
  if (!loaded.length && failed.length) throw new DataError(failed[0]);
  return {
    data: toRows(loaded.flatMap((item) => item.data)),
    fetchedAt: loaded.reduce((oldest, item) => (!oldest || item.fetchedAt < oldest ? item.fetchedAt : oldest), seasons.fetchedAt),
    stale: seasons.stale || loaded.some((item) => item.stale),
    truncated: limited || failed.length > 0,
  };
}

export async function fetchDriverCareer(driverId: string, ttl: number): Promise<Fetched<CareerRow[]>> {
  return fetchCareer(
    `drivers/${driverId}/seasons.json`,
    (year) => `${year}/drivers/${driverId}/driverstandings.json`,
    ttl,
    driverCareerFromLists,
  );
}

export async function fetchConstructorCareer(constructorId: string, ttl: number): Promise<Fetched<CareerRow[]>> {
  return fetchCareer(
    `constructors/${constructorId}/seasons.json`,
    (year) => `${year}/constructors/${constructorId}/constructorstandings.json`,
    ttl,
    constructorCareerFromLists,
  );
}

export async function fetchSeasons(ttl: number): Promise<Fetched<number[]>> {
  const paged = await getPages("seasons.json", ttl);
  const years = paged.pages
    .flatMap((page) => page.MRData.SeasonTable?.Seasons ?? [])
    .flatMap((season) => {
      const year = Number(season.season);
      return Number.isInteger(year) ? [year] : [];
    });
  return {
    data: [...new Set(years)].sort((a, b) => b - a),
    fetchedAt: paged.fetchedAt,
    stale: paged.stale,
    truncated: paged.truncated,
  };
}

export async function fetchCircuits(ttl: number): Promise<Fetched<Circuit[]>> {
  const paged = await getPages("circuits.json", ttl);
  const circuits = paged.pages
    .flatMap((page) => page.MRData.CircuitTable?.Circuits ?? [])
    .flatMap((circuit) => {
      const normalized = toCircuit(circuit);
      return normalized ? [normalized] : [];
    });
  const unique = new Map<string, Circuit>();
  for (const circuit of circuits) unique.set(circuit.id, circuit);
  return {
    data: [...unique.values()].sort((a, b) => (a.country ?? "").localeCompare(b.country ?? "") || a.name.localeCompare(b.name)),
    fetchedAt: paged.fetchedAt,
    stale: paged.stale,
    truncated: paged.truncated,
  };
}

export async function fetchCircuitWinners(circuitId: string, ttl: number): Promise<Fetched<ResultRow[]>> {
  const fetched = await fetchMergedRaces(`circuits/${circuitId}/results/1.json`, ttl);
  return { ...fetched, data: resultsFromRaces(fetched.data, "race") };
}

export function oldestFetch(parts: { fetchedAt: string | null; stale: boolean }[]): { fetchedAt: string | null; stale: boolean } {
  const times = parts.flatMap((part) => (part.fetchedAt ? [part.fetchedAt] : [])).sort();
  return { fetchedAt: times[0] ?? null, stale: parts.some((part) => part.stale) };
}
