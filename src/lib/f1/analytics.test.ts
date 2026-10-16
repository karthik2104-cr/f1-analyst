import { describe, expect, it } from "vitest";
import {
  betterIndex,
  buildProgression,
  closestBattles,
  dominantBattles,
  finishBuckets,
  gridMoves,
  headToHead,
  highestWinRates,
  median,
  pointsMismatch,
  raceInsights,
  representativeLaps,
  sampleStdev,
  summarizeDriver,
  trendLines,
  type SeasonBattle,
} from "./analytics";
import { formatSeconds, leadingBlanks, parseLapTime } from "./format";
import { mergeRaces, toResultRow } from "./normalize";
import { buildOverview } from "./present";
import type { RawRace } from "./raw";
import { racePhase, seasonIsComplete, toUtcIso } from "./schedule";
import type { QualiRow, ResultRow, SeasonBundle } from "./types";

const driver = (id: string, name: string) => ({
  id,
  code: id.slice(0, 3).toUpperCase(),
  number: "1",
  givenName: name.split(" ")[0],
  familyName: name.split(" ")[1] ?? name,
  name,
  nationality: "Test",
  dateOfBirth: null,
  url: null,
});

const team = { id: "team", name: "Team", nationality: "Test", url: null };

function result(
  overrides: Omit<Partial<ResultRow>, "constructor"> & Pick<ResultRow, "round" | "position" | "status">,
): ResultRow {
  const person = overrides.driver ?? driver("a", "Alex Example");
  return {
    season: 2026,
    raceName: `Round ${overrides.round}`,
    date: "2026-03-08",
    positionText: overrides.position ? String(overrides.position) : "R",
    points: 0,
    grid: overrides.position,
    pitLaneStart: false,
    laps: 50,
    time: null,
    millis: null,
    fastestLapRank: null,
    fastestLapLap: null,
    fastestLapTime: null,
    driver: person,
    constructor: team,
    kind: "race",
    ...overrides,
  };
}

function quali(round: number, position: number, person = driver("a", "Alex Example")): QualiRow {
  return { season: 2026, round, raceName: `Round ${round}`, date: "2026-03-08", position, q1: null, q2: null, q3: null, driver: person, constructor: team };
}

describe("time parsing", () => {
  it("parses lap and race times without inventing a value", () => {
    expect(parseLapTime("1:36.201")).toBeCloseTo(96.201);
    expect(parseLapTime("1:42:00.785")).toBeCloseTo(6120.785);
    expect(parseLapTime("")).toBeNull();
    expect(parseLapTime("nope")).toBeNull();
    expect(formatSeconds(96.201)).toBe("1:36.201");
  });

  it("does not build a countdown instant when the clock time is missing", () => {
    expect(toUtcIso("2026-10-25", null)).toBeNull();
    expect(toUtcIso("2026-10-25", "20:00:00Z")).toBe("2026-10-25T20:00:00.000Z");
  });
});

describe("race phase", () => {
  const now = new Date("2026-10-16T12:00:00Z");

  it("keeps a future race upcoming and does not call a past race without results complete", () => {
    expect(racePhase({ date: "2026-10-25", time: "20:00:00Z" }, false, now)).toBe("upcoming");
    expect(racePhase({ date: "2026-10-11", time: "12:00:00Z" }, false, now)).toBe("awaiting-results");
    expect(racePhase({ date: "2026-10-11", time: "12:00:00Z" }, true, now)).toBe("completed");
  });

  it("does not treat the current season as finished while a round remains", () => {
    expect(seasonIsComplete({ scheduledRounds: 23, standingsRound: 17, upcoming: true })).toBe(false);
    expect(seasonIsComplete({ scheduledRounds: 23, standingsRound: 23, upcoming: false })).toBe(true);
  });

  it("places 1 October 2026 on a Thursday in a Monday-first calendar", () => {
    expect(leadingBlanks(2026, 10)).toBe(3);
  });
});

describe("mergeRaces", () => {
  it("joins a classification that was split across pages and drops duplicate drivers", () => {
    const base: RawRace = { season: "2026", round: "1", raceName: "Australian Grand Prix", date: "2026-03-08" };
    const merged = mergeRaces([
      { ...base, Results: [{ position: "21", Driver: { driverId: "late", familyName: "Late", givenName: "A" }, Constructor: { constructorId: "team", name: "Team" }, points: "0", status: "Finished" }] },
      {
        ...base,
        Results: [
          { position: "1", Driver: { driverId: "winner", familyName: "Winner", givenName: "A" }, Constructor: { constructorId: "team", name: "Team" }, points: "25", status: "Finished" },
          { position: "1", Driver: { driverId: "winner", familyName: "Winner", givenName: "A" }, Constructor: { constructorId: "team", name: "Team" }, points: "25", status: "Finished" },
        ],
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].Results?.map((row) => row.Driver?.driverId)).toEqual(["late", "winner"]);
  });

  it("treats grid 0 as a pit-lane start rather than a real grid slot", () => {
    const row = toResultRow(
      { season: "2026", round: "4", raceName: "Test", date: "2026-05-03" },
      { position: "8", positionText: "8", points: "4", grid: "0", laps: "57", status: "Finished", Driver: { driverId: "a", givenName: "A", familyName: "B" }, Constructor: { constructorId: "team", name: "Team" } },
      "race",
    );
    expect(row?.grid).toBeNull();
    expect(row?.pitLaneStart).toBe(true);
  });
});

describe("driver statistics", () => {
  const alex = driver("alex", "Alex Example");
  const blake = driver("blake", "Blake Example");
  const races = [
    result({ round: 1, position: 1, status: "Finished", points: 25, grid: 2, driver: alex }),
    result({ round: 2, position: 3, status: "Finished", points: 15, grid: 1, driver: alex }),
    result({ round: 3, position: null, status: "Engine", points: 0, grid: 4, driver: alex, positionText: "R" }),
    result({ round: 4, position: null, status: "Did not start", points: 0, grid: null, driver: alex, positionText: "W" }),
    result({ round: 1, position: 2, status: "Finished", points: 18, grid: 3, driver: blake }),
    result({ round: 2, position: null, status: "Accident", points: 0, grid: 2, driver: blake, positionText: "R" }),
  ];
  const qualifying = [quali(1, 2, alex), quali(2, 1, alex), quali(1, 3, blake), quali(2, 2, blake)];

  it("excludes unclassified rows from wins, podiums, and average finish", () => {
    const stats = summarizeDriver("alex", races, qualifying, [result({ round: 2, position: 1, status: "Finished", points: 8, kind: "sprint", driver: alex })]);
    expect(stats.starts).toBe(4);
    expect(stats.wins).toBe(1);
    expect(stats.podiums).toBe(2);
    expect(stats.poles).toBe(1);
    expect(stats.dnfs).toBe(1);
    expect(stats.dns).toBe(1);
    expect(stats.points).toBe(48);
    expect(stats.racePoints).toBe(40);
    expect(stats.sprintPoints).toBe(8);
    expect(stats.pointsPerStart).toBe(10);
    expect(stats.avgFinish).toBe(2);
    expect(stats.sprintWins).toBe(1);
    expect(stats.finishRate).toBeCloseTo(0.5);
    expect(stats.dnfRate).toBeCloseTo(0.25);
  });

  it("keeps one classified grid change and drops missing or duplicate rows", () => {
    const moves = gridMoves([
      ...races,
      result({ round: 1, position: 8, status: "Finished", points: 4, grid: 10, driver: alex }),
      result({ round: 5, position: 4, status: "Finished", points: 12, grid: null, driver: alex }),
    ]);
    expect(moves).toEqual([
      { driverId: "alex", name: "Alex Example", round: 1, grid: 2, finish: 1, delta: 1 },
      { driverId: "alex", name: "Alex Example", round: 2, grid: 1, finish: 3, delta: -2 },
      { driverId: "blake", name: "Blake Example", round: 1, grid: 3, finish: 2, delta: 1 },
    ]);
  });

  it("compares only rounds both drivers contested", () => {
    const record = headToHead(
      [
        { round: 1, quali: 2, finish: 1, classified: true },
        { round: 2, quali: 1, finish: null, classified: false },
      ],
      [
        { round: 1, quali: 3, finish: 2, classified: true },
        { round: 2, quali: 2, finish: 4, classified: true },
      ],
    );
    expect(record.qualiA).toBe(2);
    expect(record.qualiB).toBe(0);
    expect(record.raceA).toBe(1);
    expect(record.raceB).toBe(1);
  });

  it("groups finishes without turning a retirement into a position", () => {
    expect(finishBuckets(races.filter((row) => row.driver.id === "alex")).map((bucket) => bucket.label)).toEqual(["P1", "P3", "DNF", "DNS"]);
  });

  it("counts a lapped numeric place as classified and leaves a lapped retirement out", () => {
    const lapped = result({ round: 5, position: 7, status: "Lapped", points: 6, positionText: "7", driver: alex });
    const flagged = result({ round: 6, position: 17, status: "Lapped", points: 0, positionText: "R", driver: alex });
    const stats = summarizeDriver("alex", [lapped, flagged], [], []);
    expect(stats.classified).toBe(1);
    expect(stats.dnfs).toBe(1);
    expect(stats.avgFinish).toBe(7);
    expect(stats.podiums).toBe(0);
    expect(finishBuckets([lapped, flagged]).map((bucket) => bucket.label)).toEqual(["P6–P10", "DNF"]);
    expect(gridMoves([lapped, flagged])).toEqual([
      { driverId: "alex", name: "Alex Example", round: 5, grid: 7, finish: 7, delta: 0 },
    ]);
  });

  it("describes a half-season trend only when both halves have enough finishes", () => {
    const short = summarizeDriver("alex", races, qualifying, []);
    expect(short.firstHalfAvg).toBeNull();
    expect(trendLines(short)[0]).toContain("Classified in 2 of 4");
    const many = Array.from({ length: 6 }, (_, index) => result({ round: index + 1, position: index + 1, status: "Finished", driver: alex }));
    const trend = trendLines(summarizeDriver("alex", many, [], []));
    expect(trend.some((line) => line.includes("half"))).toBe(true);
  });
});

describe("progression and battles", () => {
  it("carries session points forward and adds a later sprint", () => {
    const series = buildProgression(
      [
        { round: 1, label: "A" },
        { round: 2, label: "B" },
        { round: 3, label: "C" },
      ],
      [
        { round: 1, id: "a", name: "A", points: 25 },
        { round: 1, id: "b", name: "B", points: 18 },
        { round: 2, id: "b", name: "B", points: 25 },
        { round: 3, id: "a", name: "A", points: 8 },
      ],
    );
    expect(series.find((item) => item.id === "a")?.points.map((point) => point.value)).toEqual([25, 25, 33]);
    expect(series.find((item) => item.id === "b")?.points.map((point) => point.value)).toEqual([18, 43, 43]);
  });

  it("flags a standings mismatch instead of silently preferring one total", () => {
    const series = buildProgression([{ round: 1, label: "A" }], [{ round: 1, id: "a", name: "A", points: 25 }]);
    expect(pointsMismatch([{ id: "a", points: 25 }], series)).toEqual([]);
    expect(pointsMismatch([{ id: "a", points: 18 }], series)).toEqual([{ id: "a", official: 18, session: 25 }]);
  });

  it("keeps an in-progress season out of champion rankings", () => {
    const rows: SeasonBattle[] = [
      { season: 2025, inProgress: false, leader: "A", leaderId: "a", leaderPoints: 300, leaderWins: 10, second: "B", secondId: "b", secondPoints: 299, gap: 1, rounds: 24 },
      { season: 2024, inProgress: false, leader: "C", leaderId: "c", leaderPoints: 500, leaderWins: 19, second: "D", secondId: "d", secondPoints: 200, gap: 300, rounds: 24 },
      { season: 2026, inProgress: true, leader: "E", leaderId: "e", leaderPoints: 10, leaderWins: 1, second: "F", secondId: "f", secondPoints: 9, gap: 1, rounds: 4 },
    ];
    expect(closestBattles(rows).map((row) => row.season)).toEqual([2025, 2024]);
    expect(dominantBattles(rows)[0].season).toBe(2024);
    expect(highestWinRates(rows)[0].leaderId).toBe("c");
  });

  it("marks only a unique better value", () => {
    expect(betterIndex([4, 2, 3], true)).toBe(1);
    expect(betterIndex([2, 2], true)).toBeNull();
    expect(sampleStdev([1, 2, 3])).toBe(1);
    expect(median([1, 4, 10, 11])).toBe(7);
    expect(representativeLaps([90, 91, 130])).toEqual([90, 91]);
  });
});

describe("race insights and overview", () => {
  it("does not name a winner or a fastest lap that is absent", () => {
    expect(raceInsights([], [], [])).toEqual([]);
    const lines = raceInsights(
      [result({ round: 1, position: 1, status: "Finished", driver: driver("max", "Max Example"), time: "1:30:00.000", fastestLapRank: 2, fastestLapTime: "1:20.000" })],
      [],
      [],
    );
    expect(lines.join(" ")).toContain("Max Example classified P1");
    expect(lines.join(" ")).not.toContain("Fastest lap");
  });

  it("does not invent a winner for a past grand prix that has no classification", () => {
    const bundle: SeasonBundle = {
      season: 2026,
      schedule: [
        {
          season: 2026,
          round: 1,
          name: "Test Grand Prix",
          url: null,
          date: "2026-03-08",
          time: "04:00:00Z",
          circuit: { id: "test", name: "Test Circuit", locality: "Test", country: "Testland", lat: 1, lng: 2, url: null },
          sessions: { fp1: null, fp2: null, fp3: null, qualifying: null, sprintQualifying: null, sprint: null, race: { date: "2026-03-08", time: "04:00:00Z" } },
        },
      ],
      driverStandings: [],
      constructorStandings: [],
      results: [],
      qualifying: [],
      sprints: [],
      meta: { source: "Jolpica-F1", sourceLabel: "test", fetchedAt: "2026-10-16T00:00:00.000Z", stale: false, partial: [], season: 2026, standingsRound: null },
    };
    const overview = buildOverview(bundle, new Date("2026-10-16T00:00:00Z"));
    expect(overview.lastRace).toBeNull();
    expect(overview.driverTop).toEqual([]);
    expect(overview.awaiting[0]?.name).toBe("Test Grand Prix");
    expect(overview.stats.find((stat) => stat.label === "Driver leader")?.value).toBe("—");
    expect(overview.movers).toEqual([]);
    expect(overview.statusLine).toContain("classification");
  });
});
