import { parseLapTime, toNumber } from "./format";
import type {
  RawCircuit,
  RawConstructor,
  RawDriver,
  RawQuali,
  RawRace,
  RawResult,
  RawSession,
  RawStandingsList,
} from "./raw";
import type {
  CareerRow,
  Circuit,
  Constructor,
  ConstructorStanding,
  Driver,
  DriverStanding,
  LapTiming,
  PitStop,
  QualiRow,
  ResultRow,
  ScheduledRace,
  SessionTime,
} from "./types";

export function toDriver(raw: RawDriver | undefined | null): Driver | null {
  if (!raw?.driverId) return null;
  const givenName = raw.givenName ?? "";
  const familyName = raw.familyName ?? raw.driverId;
  return {
    id: raw.driverId,
    code: raw.code ?? null,
    number: raw.permanentNumber ?? null,
    givenName,
    familyName,
    name: `${givenName} ${familyName}`.trim(),
    nationality: raw.nationality ?? null,
    dateOfBirth: raw.dateOfBirth ?? null,
    url: raw.url ?? null,
  };
}

export function toConstructor(raw: RawConstructor | undefined | null): Constructor | null {
  if (!raw?.constructorId || !raw.name) return null;
  return {
    id: raw.constructorId,
    name: raw.name,
    nationality: raw.nationality ?? null,
    url: raw.url ?? null,
  };
}

export function toCircuit(raw: RawCircuit | undefined | null): Circuit | null {
  if (!raw?.circuitId || !raw.circuitName) return null;
  return {
    id: raw.circuitId,
    name: raw.circuitName,
    locality: raw.Location?.locality?.trim() || null,
    country: raw.Location?.country?.trim() || null,
    lat: toNumber(raw.Location?.lat),
    lng: toNumber(raw.Location?.long),
    url: raw.url ?? null,
  };
}

function toSession(raw: RawSession | undefined): SessionTime | null {
  if (!raw?.date) return null;
  return { date: raw.date, time: raw.time ?? null };
}

export function toScheduledRace(raw: RawRace): ScheduledRace | null {
  const circuit = toCircuit(raw.Circuit);
  const season = toNumber(raw.season);
  const round = toNumber(raw.round);
  if (!circuit || season == null || round == null || !raw.date || !raw.raceName) return null;
  return {
    season,
    round,
    name: raw.raceName,
    url: raw.url ?? null,
    date: raw.date,
    time: raw.time ?? null,
    circuit,
    sessions: {
      fp1: toSession(raw.FirstPractice),
      fp2: toSession(raw.SecondPractice),
      fp3: toSession(raw.ThirdPractice),
      qualifying: toSession(raw.Qualifying),
      sprintQualifying: toSession(raw.SprintQualifying),
      sprint: toSession(raw.Sprint),
      race: { date: raw.date, time: raw.time ?? null },
    },
  };
}

export function toResultRow(race: RawRace, raw: RawResult, kind: "race" | "sprint"): ResultRow | null {
  const driver = toDriver(raw.Driver);
  const constructor = toConstructor(raw.Constructor);
  const season = toNumber(race.season);
  const round = toNumber(race.round);
  if (!driver || !constructor || season == null || round == null) return null;
  const grid = toNumber(raw.grid);
  return {
    season,
    round,
    raceName: race.raceName ?? `Round ${round}`,
    date: race.date ?? "",
    position: toNumber(raw.position),
    positionText: raw.positionText ?? "",
    points: toNumber(raw.points) ?? 0,
    grid: grid != null && grid > 0 ? grid : null,
    pitLaneStart: grid === 0,
    laps: toNumber(raw.laps) ?? 0,
    status: raw.status ?? "Unknown",
    time: raw.Time?.time ?? null,
    millis: toNumber(raw.Time?.millis),
    fastestLapRank: toNumber(raw.FastestLap?.rank),
    fastestLapLap: toNumber(raw.FastestLap?.lap),
    fastestLapTime: raw.FastestLap?.Time?.time ?? null,
    driver,
    constructor,
    kind,
  };
}

export function toQualiRow(race: RawRace, raw: RawQuali): QualiRow | null {
  const driver = toDriver(raw.Driver);
  const constructor = toConstructor(raw.Constructor);
  const season = toNumber(race.season);
  const round = toNumber(race.round);
  if (!driver || !constructor || season == null || round == null) return null;
  return {
    season,
    round,
    raceName: race.raceName ?? `Round ${round}`,
    date: race.date ?? "",
    position: toNumber(raw.position),
    q1: raw.Q1 ?? null,
    q2: raw.Q2 ?? null,
    q3: raw.Q3 ?? null,
    driver,
    constructor,
  };
}

export function resultsFromRaces(races: RawRace[], kind: "race" | "sprint"): ResultRow[] {
  const rows: ResultRow[] = [];
  for (const race of races) {
    const source = kind === "race" ? race.Results : race.SprintResults;
    for (const result of source ?? []) {
      const row = toResultRow(race, result, kind);
      if (row) rows.push(row);
    }
  }
  return rows;
}

export function qualiFromRaces(races: RawRace[]): QualiRow[] {
  const rows: QualiRow[] = [];
  for (const race of races) {
    for (const result of race.QualifyingResults ?? []) {
      const row = toQualiRow(race, result);
      if (row) rows.push(row);
    }
  }
  return rows;
}

export function pitsFromRace(race: RawRace): PitStop[] {
  const stops: PitStop[] = [];
  for (const pit of race.PitStops ?? []) {
    const lap = toNumber(pit.lap);
    const stop = toNumber(pit.stop);
    if (!pit.driverId || lap == null || stop == null) continue;
    stops.push({
      driverId: pit.driverId,
      lap,
      stop,
      time: pit.time ?? null,
      duration: toNumber(pit.duration),
    });
  }
  return stops;
}

export function lapsFromRace(race: RawRace): LapTiming[] {
  const timings: LapTiming[] = [];
  for (const lap of race.Laps ?? []) {
    const lapNumber = toNumber(lap.number);
    if (lapNumber == null) continue;
    for (const timing of lap.Timings ?? []) {
      if (!timing.driverId) continue;
      timings.push({
        lap: lapNumber,
        driverId: timing.driverId,
        position: toNumber(timing.position),
        time: timing.time ?? null,
        seconds: parseLapTime(timing.time),
      });
    }
  }
  return timings;
}

function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(item);
  }
  return unique;
}

export function mergeRaces(races: RawRace[]): RawRace[] {
  const map = new Map<string, RawRace>();
  for (const race of races) {
    const key = `${race.season ?? ""}:${race.round ?? ""}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...race,
        Results: race.Results ? [...race.Results] : undefined,
        QualifyingResults: race.QualifyingResults ? [...race.QualifyingResults] : undefined,
        SprintResults: race.SprintResults ? [...race.SprintResults] : undefined,
        PitStops: race.PitStops ? [...race.PitStops] : undefined,
        Laps: race.Laps ? race.Laps.map((lap) => ({ ...lap, Timings: lap.Timings ? [...lap.Timings] : undefined })) : undefined,
      });
      continue;
    }
    if (race.Results?.length) existing.Results = [...(existing.Results ?? []), ...race.Results];
    if (race.QualifyingResults?.length) {
      existing.QualifyingResults = [...(existing.QualifyingResults ?? []), ...race.QualifyingResults];
    }
    if (race.SprintResults?.length) existing.SprintResults = [...(existing.SprintResults ?? []), ...race.SprintResults];
    if (race.PitStops?.length) existing.PitStops = [...(existing.PitStops ?? []), ...race.PitStops];
    if (race.Laps?.length) existing.Laps = [...(existing.Laps ?? []), ...race.Laps];
    existing.raceName = existing.raceName || race.raceName;
    existing.date = existing.date || race.date;
    existing.time = existing.time || race.time;
    existing.Circuit = existing.Circuit || race.Circuit;
  }

  for (const race of map.values()) {
    if (race.Results) race.Results = dedupe(race.Results, (row) => row.Driver?.driverId ?? JSON.stringify(row));
    if (race.QualifyingResults) {
      race.QualifyingResults = dedupe(race.QualifyingResults, (row) => row.Driver?.driverId ?? JSON.stringify(row));
    }
    if (race.SprintResults) {
      race.SprintResults = dedupe(race.SprintResults, (row) => row.Driver?.driverId ?? JSON.stringify(row));
    }
    if (race.PitStops) race.PitStops = dedupe(race.PitStops, (row) => `${row.driverId}:${row.stop}`);
    if (race.Laps) {
      const laps = new Map<string, { number?: string; Timings?: { driverId?: string; position?: string; time?: string }[] }>();
      for (const lap of race.Laps) {
        const number = lap.number ?? "";
        const got = laps.get(number);
        if (!got) laps.set(number, { number: lap.number, Timings: [...(lap.Timings ?? [])] });
        else got.Timings = [...(got.Timings ?? []), ...(lap.Timings ?? [])];
      }
      race.Laps = [...laps.values()]
        .sort((a, b) => (toNumber(a.number) ?? 0) - (toNumber(b.number) ?? 0))
        .map((lap) => ({ ...lap, Timings: dedupe(lap.Timings ?? [], (timing) => timing.driverId ?? "") }));
    }
  }

  return [...map.values()].sort((a, b) => (toNumber(a.round) ?? 0) - (toNumber(b.round) ?? 0));
}

function latestList(lists: RawStandingsList[]): RawStandingsList | null {
  if (!lists.length) return null;
  return [...lists].sort((a, b) => (toNumber(b.round) ?? 0) - (toNumber(a.round) ?? 0))[0];
}

export function driverStandingsFromLists(lists: RawStandingsList[]): {
  round: number | null;
  season: number | null;
  rows: DriverStanding[];
} {
  const list = latestList(lists);
  if (!list) return { round: null, season: null, rows: [] };
  const rows = (list.DriverStandings ?? []).flatMap((raw) => {
    const driver = toDriver(raw.Driver);
    const position = toNumber(raw.position);
    if (!driver || position == null) return [];
    const standing: DriverStanding = {
      position,
      points: toNumber(raw.points) ?? 0,
      wins: toNumber(raw.wins) ?? 0,
      driver,
      constructors: (raw.Constructors ?? []).flatMap((item) => {
        const constructor = toConstructor(item);
        return constructor ? [constructor] : [];
      }),
    };
    return [standing];
  });
  rows.sort((a, b) => a.position - b.position || b.points - a.points);
  return { round: toNumber(list.round), season: toNumber(list.season), rows: dedupe(rows, (row) => row.driver.id) };
}

export function constructorStandingsFromLists(lists: RawStandingsList[]): {
  round: number | null;
  season: number | null;
  rows: ConstructorStanding[];
} {
  const list = latestList(lists);
  if (!list) return { round: null, season: null, rows: [] };
  const rows = (list.ConstructorStandings ?? []).flatMap((raw) => {
    const constructor = toConstructor(raw.Constructor);
    const position = toNumber(raw.position);
    if (!constructor || position == null) return [];
    return [
      {
        position,
        points: toNumber(raw.points) ?? 0,
        wins: toNumber(raw.wins) ?? 0,
        constructor,
      },
    ];
  });
  rows.sort((a, b) => a.position - b.position || b.points - a.points);
  return { round: toNumber(list.round), season: toNumber(list.season), rows: dedupe(rows, (row) => row.constructor.id) };
}

export function driverCareerFromLists(lists: RawStandingsList[]): CareerRow[] {
  const rows: CareerRow[] = [];
  for (const list of lists) {
    const standing = list.DriverStandings?.[0];
    const season = toNumber(list.season);
    const position = toNumber(standing?.position);
    if (!standing || season == null || position == null) continue;
    const teams = (standing.Constructors ?? []).map((item) => item.name).filter((name): name is string => Boolean(name));
    rows.push({
      season,
      round: toNumber(list.round) ?? 0,
      position,
      points: toNumber(standing.points) ?? 0,
      wins: toNumber(standing.wins) ?? 0,
      teams: teams.join(", ") || "—",
    });
  }
  return dedupe(rows, (row) => String(row.season)).sort((a, b) => a.season - b.season);
}

export function constructorCareerFromLists(lists: RawStandingsList[]): CareerRow[] {
  const rows: CareerRow[] = [];
  for (const list of lists) {
    const standing = list.ConstructorStandings?.[0];
    const season = toNumber(list.season);
    const position = toNumber(standing?.position);
    if (!standing || season == null || position == null) continue;
    rows.push({
      season,
      round: toNumber(list.round) ?? 0,
      position,
      points: toNumber(standing.points) ?? 0,
      wins: toNumber(standing.wins) ?? 0,
      teams: standing.Constructor?.name ?? "—",
    });
  }
  return dedupe(rows, (row) => String(row.season)).sort((a, b) => a.season - b.season);
}

export function mergeStandingsLists(lists: RawStandingsList[]): RawStandingsList[] {
  const map = new Map<string, RawStandingsList>();
  for (const list of lists) {
    const key = `${list.season ?? ""}:${list.round ?? ""}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...list,
        DriverStandings: list.DriverStandings ? [...list.DriverStandings] : undefined,
        ConstructorStandings: list.ConstructorStandings ? [...list.ConstructorStandings] : undefined,
      });
      continue;
    }
    if (list.DriverStandings?.length) existing.DriverStandings = [...(existing.DriverStandings ?? []), ...list.DriverStandings];
    if (list.ConstructorStandings?.length) {
      existing.ConstructorStandings = [...(existing.ConstructorStandings ?? []), ...list.ConstructorStandings];
    }
  }
  return [...map.values()];
}
