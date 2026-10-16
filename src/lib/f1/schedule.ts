import type { RacePhase } from "./types";

export function toUtcIso(date: string | null | undefined, time: string | null | undefined): string | null {
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const zone = time.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(time) ? time : `${time}Z`;
  const iso = `${date}T${zone}`;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function racePhase(
  race: { date: string; time: string | null },
  hasResults: boolean,
  now: Date,
): RacePhase {
  if (hasResults) return "completed";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(race.date)) return "upcoming";
  const today = now.toISOString().slice(0, 10);
  if (race.date > today) return "upcoming";
  if (race.date < today) return "awaiting-results";
  const start = toUtcIso(race.date, race.time);
  if (!start) return "upcoming";
  return Date.parse(start) > now.getTime() ? "upcoming" : "awaiting-results";
}

export function seasonIsComplete(input: {
  scheduledRounds: number;
  standingsRound: number | null;
  upcoming: boolean;
}): boolean {
  if (input.upcoming || input.scheduledRounds <= 0 || input.standingsRound == null) return false;
  return input.standingsRound >= input.scheduledRounds;
}
