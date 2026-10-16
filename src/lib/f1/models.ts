import type { ProgressionPoint, SeasonBattle } from "./analytics";
import type { DriverStats } from "./analytics";
import type {
  CareerRow,
  Circuit,
  Constructor,
  DataMeta,
  Driver,
  QualiRow,
  RacePhase,
  ResultRow,
  ScheduledRace,
} from "./types";

export type ChartSeries = {
  id: string;
  name: string;
  color: string;
  points: ProgressionPoint[];
};

export type StatTile = {
  label: string;
  value: string;
  detail?: string;
};

export type OverviewModel = {
  meta: DataMeta;
  season: number;
  roundsScheduled: number;
  roundsCompleted: number;
  nextRace: { race: ScheduledRace; startIso: string | null } | null;
  awaiting: { round: number; name: string; date: string }[];
  lastRace: {
    race: ScheduledRace;
    winner: ResultRow | null;
    podium: ResultRow[];
    fastestLap: { driver: string; lap: number | null; time: string | null } | null;
  } | null;
  driverTop: { position: number; id: string; name: string; code: string | null; team: string | null; points: number; wins: number; gap: number | null }[];
  constructorTop: { position: number; id: string; name: string; points: number; wins: number; gap: number | null }[];
  recent: { round: number; name: string; date: string; winner: string | null; winnerId: string | null; team: string | null; time: string | null }[];
  activity: { round: number; name: string; date: string; circuit: string; country: string | null; winner: string | null; pole: string | null; fastestLap: string | null }[];
  progression: ChartSeries[];
  progressionNote: string;
  constructorProgression: ChartSeries[];
  constructorProgressionNote: string;
  constructorBars: { label: string; value: number }[];
  pace: { name: string; avgQuali: number | null; avgFinish: number | null }[];
  paceNote: string;
  movers: { id: string; name: string; round: number; race: string; grid: number; finish: number; delta: number }[];
  moversNote: string;
  statusLine: string;
  stats: StatTile[];
  links: { href: string; title: string; detail: string }[];
};

export type CalendarRace = ScheduledRace & {
  phase: RacePhase;
  winner: string | null;
  winnerId: string | null;
  pole: string | null;
};

export type CalendarModel = {
  meta: DataMeta;
  season: number;
  races: CalendarRace[];
};

export type StandingRow = {
  position: number;
  delta: number | "new" | null;
  id: string;
  name: string;
  code: string | null;
  number: string | null;
  team: string | null;
  href: string;
  points: number;
  wins: number;
  podiums: number | null;
  poles: number | null;
  fastestLaps: number | null;
  starts: number | null;
};

export type StandingsModel = {
  meta: DataMeta;
  season: number;
  showDelta: boolean;
  drivers: StandingRow[];
  constructors: StandingRow[];
  driverProgression: ChartSeries[];
  constructorProgression: ChartSeries[];
  progressionNote: string;
  constructorProgressionNote: string;
};

export type DriverIndexModel = {
  meta: DataMeta;
  season: number;
  rows: StandingRow[];
};

export type DriverDirectoryItem = { id: string; name: string; code: string | null };

export type TeammateView = {
  driver: Driver;
  raceCompared: number;
  raceAhead: number;
  raceBehind: number;
  qualiCompared: number;
  qualiAhead: number;
  qualiBehind: number;
  sessionPoints: number;
  share: number | null;
  avgFinish: number | null;
};

export type RecentDriverResult = {
  round: number;
  name: string;
  date: string;
  grid: number | null;
  quali: number | null;
  finish: number | null;
  positionText: string;
  status: string;
  points: number;
  sprintPosition: string | null;
  constructorName: string;
};

export type DriverProfileModel = {
  meta: DataMeta;
  season: number;
  driver: Driver;
  team: Constructor | null;
  standing: { position: number; points: number; wins: number } | null;
  stats: DriverStats;
  pointsLabel: string;
  pointsValue: number;
  pointsNote: string | null;
  trend: string[];
  progression: ChartSeries[];
  rounds: { round: number; label: string; finish: number | null; quali: number | null; grid: number | null }[];
  distribution: { label: string; count: number }[];
  recent: RecentDriverResult[];
  teammates: TeammateView[];
  teamSessionPoints: number | null;
  driverTeamShare: number | null;
  career: CareerRow[];
  careerNote: string;
  directory: DriverDirectoryItem[];
};

export type ConstructorLineup = {
  driver: Driver;
  href: string;
  championshipPoints: number | null;
  sessionPoints: number;
  share: number | null;
  wins: number;
  podiums: number;
};

export type ConstructorProfileModel = {
  meta: DataMeta;
  season: number;
  constructor: Constructor;
  standing: { position: number; points: number; wins: number } | null;
  lineup: ConstructorLineup[];
  sessionPoints: number;
  wins: number;
  podiums: number;
  pointsNote: string | null;
  progression: ChartSeries[];
  pointsByRound: { round: number; label: string; points: number }[];
  career: CareerRow[];
  careerNote: string;
  directory: { id: string; name: string }[];
};

export type ConstructorIndexModel = {
  meta: DataMeta;
  season: number;
  rows: StandingRow[];
  progression: ChartSeries[];
  progressionNote: string;
};

export type CompareDriver = {
  driver: Driver;
  team: string | null;
  color: string;
  href: string;
  stats: DriverStats;
  officialPoints: number | null;
  officialWins: number | null;
  position: number | null;
};

export type CompareMetric = {
  key: string;
  label: string;
  definition: string;
  lowerBetter: boolean;
  comparable: boolean;
  values: (number | null)[];
};

export type CompareModel = {
  meta: DataMeta;
  season: number;
  drivers: CompareDriver[];
  directory: DriverDirectoryItem[];
  metrics: CompareMetric[];
  pairs: { a: string; b: string; qualiA: number; qualiB: number; qualiTied: number; qualiCompared: number; raceA: number; raceB: number; raceTied: number; raceCompared: number }[];
  progression: ChartSeries[];
  progressionNote: string;
  rounds: { round: number; name: string }[];
  selectedRound: number | null;
  lapSamples: { driverId: string; name: string; seconds: number[] }[] | null;
  lapNote: string | null;
};

export type RacePickerItem = {
  round: number;
  name: string;
  date: string;
  circuit: string;
  country: string | null;
  phase: RacePhase;
  winner: string | null;
};

export type RaceIndexModel = {
  meta: DataMeta;
  season: number;
  races: RacePickerItem[];
  latestRound: number | null;
};

export type RaceDriver = {
  id: string;
  name: string;
  code: string | null;
  number: string | null;
  constructorId: string;
  constructorName: string;
};

export type RaceDetailModel = {
  meta: DataMeta;
  season: number;
  round: number;
  race: ScheduledRace;
  phase: RacePhase;
  results: ResultRow[];
  qualifying: QualiRow[];
  sprint: ResultRow[];
  pitstops: { driverId: string; driverName: string; constructorName: string; lap: number; stop: number; time: string | null; duration: number | null }[];
  laps: { lap: number; driverId: string; position: number | null; seconds: number | null }[];
  drivers: RaceDriver[];
  insights: string[];
  lapNote: string | null;
  pitNote: string | null;
  rounds: { round: number; name: string }[];
};

export type CircuitIndexModel = {
  meta: DataMeta;
  circuits: Circuit[];
};

export type CircuitWinner = {
  season: number;
  round: number;
  name: string;
  date: string;
  driver: string;
  driverId: string;
  constructorName: string;
  constructorId: string;
};

export type CircuitModel = {
  meta: DataMeta;
  circuit: Circuit;
  winners: CircuitWinner[];
  mostSuccessful: { driver: string; driverId: string; wins: number }[];
  truncated: boolean;
  seasonEvent: { season: number; round: number; name: string; date: string; phase: RacePhase } | null;
};

export type HistoryModel = {
  meta: DataMeta;
  from: number;
  to: number;
  currentSeason: number;
  inProgress: boolean;
  failed: string[];
  drivers: SeasonBattle[];
  constructors: SeasonBattle[];
};

export type BriefModel = {
  season: number;
  roundsScheduled: number;
  standingsRound: number | null;
  fetchedAt: string | null;
  stale: boolean;
  leader: { name: string; points: number; wins: number } | null;
  gap: number | null;
  constructorLeader: { name: string; points: number } | null;
  constructorGap: number | null;
  nextRace: { name: string; round: number; date: string } | null;
  partial: string[];
};

export type SearchHit = { href: string; label: string; detail: string };

export type SearchModel = {
  season: number;
  drivers: SearchHit[];
  constructors: SearchHit[];
  races: SearchHit[];
};
