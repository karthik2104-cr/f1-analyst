export type Driver = {
  id: string;
  code: string | null;
  number: string | null;
  givenName: string;
  familyName: string;
  name: string;
  nationality: string | null;
  dateOfBirth: string | null;
  url: string | null;
};

export type Constructor = {
  id: string;
  name: string;
  nationality: string | null;
  url: string | null;
};

export type Circuit = {
  id: string;
  name: string;
  locality: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  url: string | null;
};

export type SessionTime = {
  date: string;
  time: string | null;
};

export type ScheduledRace = {
  season: number;
  round: number;
  name: string;
  url: string | null;
  date: string;
  time: string | null;
  circuit: Circuit;
  sessions: {
    fp1: SessionTime | null;
    fp2: SessionTime | null;
    fp3: SessionTime | null;
    qualifying: SessionTime | null;
    sprintQualifying: SessionTime | null;
    sprint: SessionTime | null;
    race: SessionTime;
  };
};

export type ResultRow = {
  season: number;
  round: number;
  raceName: string;
  date: string;
  position: number | null;
  positionText: string;
  points: number;
  grid: number | null;
  pitLaneStart: boolean;
  laps: number;
  status: string;
  time: string | null;
  millis: number | null;
  fastestLapRank: number | null;
  fastestLapLap: number | null;
  fastestLapTime: string | null;
  driver: Driver;
  constructor: Constructor;
  kind: "race" | "sprint";
};

export type QualiRow = {
  season: number;
  round: number;
  raceName: string;
  date: string;
  position: number | null;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  driver: Driver;
  constructor: Constructor;
};

export type DriverStanding = {
  position: number;
  points: number;
  wins: number;
  driver: Driver;
  constructors: Constructor[];
};

export type ConstructorStanding = {
  position: number;
  points: number;
  wins: number;
  constructor: Constructor;
};

export type PitStop = {
  driverId: string;
  lap: number;
  stop: number;
  time: string | null;
  duration: number | null;
};

export type LapTiming = {
  lap: number;
  driverId: string;
  position: number | null;
  time: string | null;
  seconds: number | null;
};

export type DataMeta = {
  source: "Jolpica-F1";
  sourceLabel: string;
  fetchedAt: string | null;
  stale: boolean;
  partial: string[];
  season: number | null;
  standingsRound: number | null;
};

export type SeasonBundle = {
  season: number;
  schedule: ScheduledRace[];
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  results: ResultRow[];
  qualifying: QualiRow[];
  sprints: ResultRow[];
  meta: DataMeta;
};

export type RacePhase = "upcoming" | "completed" | "awaiting-results";

export type CareerRow = {
  season: number;
  round: number;
  position: number;
  points: number;
  wins: number;
  teams: string;
};
