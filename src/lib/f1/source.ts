export const SOURCE_NAME = "Jolpica-F1";
export const SOURCE_URL = "https://github.com/jolpica/jolpica-f1";
export const SOURCE_API = "https://api.jolpi.ca/ergast/f1";

export const DEFINITIONS = {
  sessionPoints:
    "Points summed from race and sprint classification rows. Official championship points can differ if a penalty or correction was applied after those rows were published.",
  classified: "A result whose status is Finished, a completed gap such as +1 Lap, or Lapped when the position text is the finishing place. Lapped with a non-numeric position text, such as R, stays unclassified.",
  avgFinish: "Mean finishing position of classified results. Unclassified results are excluded.",
  avgQuali: "Mean qualifying position across rounds where a qualifying classification exists.",
  placesFromQuali:
    "Qualifying position minus classified finish. Positive means the driver finished ahead of where they qualified.",
  placesFromGrid: "Grid position minus classified finish. A grid of 0, the pit-lane start code, is excluded.",
  finishRate:
    "Classified results divided by race starts. Did-not-start entries count as starts and as not finished.",
  dnfRate:
    "Unclassified retirements divided by race starts. Disqualifications, did-not-starts, withdrawals, exclusions, and failed qualifications are not included in the DNF rate.",
  consistency:
    "Sample standard deviation of classified finishing positions. Lower means a tighter spread. It is not a pace rating.",
  finishHalves:
    "Classified results are ordered by round and split in half. Each half needs at least three finishes before a comparison is shown. A gap under 0.15 places is treated as level.",
  headToHeadRace:
    "Both drivers must appear in the same round. A classified driver is ahead of an unclassified driver. Rounds where both are unclassified are excluded.",
  headToHeadQuali:
    "Counted only when both drivers have a qualifying position for the same round. The lower position wins. Equal positions are ties.",
  poles: "Qualifying position 1. Sprint qualifying is not included because that classification is not loaded.",
  fastestLap: "Race rows whose fastest-lap rank is 1. Sprint fastest laps are counted separately.",
  wins: "Grand Prix classifications in position 1. Sprint wins are not added to this total.",
  podiums: "Classified Grand Prix finishes in positions 1, 2, or 3.",
  winRate:
    "Grand Prix wins recorded on the standings row divided by the standings round, which is the number of rounds included in that table.",
  pointsGap:
    "Leader points minus second-place points inside one season. Absolute points are not treated as comparable strength across seasons, because the scoring system has changed.",
  inProgress:
    "The current season stays in progress until its standings round covers every scheduled race and no race start is still in the future. An in-progress leader is not labelled a champion.",
  lapFilter:
    "The 107% control hides laps slower than 107% of that driver's own median in the loaded sample. It is a display filter, not an official session statistic.",
  medianLap:
    "Median of the lap times published for that driver in the selected race. In-laps and safety-car laps stay in the sample unless the 107% filter is on.",
  teammateShare:
    "Race and sprint points a driver scored for this constructor, divided by all race and sprint points scored for the constructor in the loaded results.",
  careerPosition: "Championship position stored for that season in the standings feed. It is not recalculated from race results.",
  circuitSpecs:
    "Track length, corner count, lap record, and race distance are not in the connected circuit feed, so they are omitted rather than estimated.",
  notLive: "This application does not use a live timing feed. Figures appear after Jolpica publishes them.",
  positionDelta:
    "Previous published championship position minus the current position. A positive number means the entry moved up. New entries were absent from the previous round.",
} as const;
