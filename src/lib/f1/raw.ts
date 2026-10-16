export type RawSession = { date?: string; time?: string };

export type RawCircuit = {
  circuitId?: string;
  url?: string;
  circuitName?: string;
  Location?: { lat?: string; long?: string; locality?: string; country?: string };
};

export type RawDriver = {
  driverId?: string;
  permanentNumber?: string;
  code?: string;
  url?: string;
  givenName?: string;
  familyName?: string;
  dateOfBirth?: string;
  nationality?: string;
};

export type RawConstructor = {
  constructorId?: string;
  url?: string;
  name?: string;
  nationality?: string;
};

export type RawResult = {
  number?: string;
  position?: string;
  positionText?: string;
  points?: string;
  Driver?: RawDriver;
  Constructor?: RawConstructor;
  grid?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time?: string };
  FastestLap?: { rank?: string; lap?: string; Time?: { time?: string } };
};

export type RawQuali = {
  number?: string;
  position?: string;
  Driver?: RawDriver;
  Constructor?: RawConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
};

export type RawPit = {
  driverId?: string;
  lap?: string;
  stop?: string;
  time?: string;
  duration?: string;
};

export type RawLap = {
  number?: string;
  Timings?: { driverId?: string; position?: string; time?: string }[];
};

export type RawRace = {
  season?: string;
  round?: string;
  url?: string;
  raceName?: string;
  Circuit?: RawCircuit;
  date?: string;
  time?: string;
  FirstPractice?: RawSession;
  SecondPractice?: RawSession;
  ThirdPractice?: RawSession;
  Qualifying?: RawSession;
  Sprint?: RawSession;
  SprintQualifying?: RawSession;
  Results?: RawResult[];
  QualifyingResults?: RawQuali[];
  SprintResults?: RawResult[];
  PitStops?: RawPit[];
  Laps?: RawLap[];
};

export type RawDriverStanding = {
  position?: string;
  positionText?: string;
  points?: string;
  wins?: string;
  Driver?: RawDriver;
  Constructors?: RawConstructor[];
};

export type RawConstructorStanding = {
  position?: string;
  positionText?: string;
  points?: string;
  wins?: string;
  Constructor?: RawConstructor;
};

export type RawStandingsList = {
  season?: string;
  round?: string;
  DriverStandings?: RawDriverStanding[];
  ConstructorStandings?: RawConstructorStanding[];
};

export type JolpicaPayload = {
  MRData: {
    total?: string;
    limit?: string;
    offset?: string;
    url?: string;
    RaceTable?: { season?: string; round?: string; Races?: RawRace[] };
    StandingsTable?: { season?: string; round?: string; StandingsLists?: RawStandingsList[] };
    CircuitTable?: { Circuits?: RawCircuit[] };
    SeasonTable?: { Seasons?: { season?: string; url?: string }[] };
  };
};
