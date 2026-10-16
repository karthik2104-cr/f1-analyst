"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MetaBar, PageHeader } from "@/components/ui/Chrome";
import { LocalTime } from "@/components/ui/Time";
import { daysInMonth, leadingBlanks, monthLabel, shortRace } from "@/lib/f1/format";
import type { CalendarModel, CalendarRace } from "@/lib/f1/models";
import { racePath } from "@/lib/f1/routes";

const PHASES = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "awaiting-results", label: "Awaiting results" },
] as const;

export function CalendarView({ model }: { model: CalendarModel }) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<(typeof PHASES)[number]["id"]>("all");
  const [mode, setMode] = useState<"cards" | "table" | "month">("cards");
  const races = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return model.races.filter((race) => {
      const matchesPhase = phase === "all" || race.phase === phase;
      const haystack = `${race.name} ${race.circuit.name} ${race.circuit.country ?? ""} ${race.circuit.locality ?? ""}`.toLowerCase();
      return matchesPhase && (!needle || haystack.includes(needle));
    });
  }, [model.races, phase, query]);
  const counts = {
    completed: model.races.filter((race) => race.phase === "completed").length,
    upcoming: model.races.filter((race) => race.phase === "upcoming").length,
    awaiting: model.races.filter((race) => race.phase === "awaiting-results").length,
  };

  return (
    <>
      <PageHeader kicker={`Season ${model.season}`} title="Race calendar" description="Session times are the UTC timestamps published with the schedule. A race is completed only when a classification exists." />
      <MetaBar meta={model.meta} />
      <div className="toolbar">
        <label className="field">Search
          <input className="control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Grand Prix, circuit, country" />
        </label>
        <label className="field">Status
          <select className="control" value={phase} onChange={(event) => setPhase(event.target.value as (typeof PHASES)[number]["id"])}>
            {PHASES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <div className="filters" role="group" aria-label="Calendar layout">
          <button type="button" className={mode === "cards" ? "chip chip-on" : "chip"} aria-pressed={mode === "cards"} onClick={() => setMode("cards")}>Cards</button>
          <button type="button" className={mode === "table" ? "chip chip-on" : "chip"} aria-pressed={mode === "table"} onClick={() => setMode("table")}>Table</button>
          <button type="button" className={mode === "month" ? "chip chip-on" : "chip"} aria-pressed={mode === "month"} onClick={() => setMode("month")}>Months</button>
        </div>
        <p className="note">{counts.completed} completed · {counts.upcoming} upcoming · {counts.awaiting} awaiting results</p>
      </div>
      {mode === "cards" ? <RaceCards races={races} season={model.season} /> : mode === "table" ? <RaceList races={races} season={model.season} /> : <MonthBoard races={races} season={model.season} />}
      {!races.length ? <p className="note">No grands prix match these filters.</p> : null}
    </>
  );
}

function phaseClass(phase: CalendarRace["phase"]) {
  if (phase === "completed") return "chip phase-completed";
  if (phase === "upcoming") return "chip phase-upcoming";
  return "chip phase-awaiting";
}

function phaseLabel(phase: CalendarRace["phase"]) {
  if (phase === "awaiting-results") return "Awaiting results";
  return phase;
}

function RaceCards({ races, season }: { races: CalendarRace[]; season: number }) {
  return (
    <div className="race-board">
      {races.map((race) => (
        <article key={race.round} className="race-card">
          <p className="kicker">Round {race.round}</p>
          <h2><Link href={racePath(season, race.round)}>{race.name}</Link></h2>
          <p className="note">{race.circuit.name}{race.circuit.locality ? ` · ${race.circuit.locality}` : ""}{race.circuit.country ? `, ${race.circuit.country}` : ""}</p>
          <LocalTime date={race.date} time={race.time} />
          <p><span className={phaseClass(race.phase)}>{phaseLabel(race.phase)}</span></p>
          <p className="note">{race.phase === "completed" ? `Winner ${race.winner ?? "not identified"}` : "No winner is shown before a classification exists."}{race.pole ? ` · Pole ${race.pole}` : ""}</p>
        </article>
      ))}
    </div>
  );
}

function RaceList({ races, season }: { races: CalendarRace[]; season: number }) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Season calendar</caption>
          <thead>
            <tr><th>Rnd</th><th>Grand Prix</th><th>Circuit</th><th>Date</th><th>Status</th><th>Winner</th><th>Pole</th></tr>
          </thead>
          <tbody>
            {races.map((race) => (
              <tr key={race.round}>
                <td className="num">{race.round}</td>
                <td><Link className="table-link" href={racePath(season, race.round)}>{race.name}</Link></td>
                <td>{race.circuit.name}<span className="note"> · {race.circuit.country}</span></td>
                <td><LocalTime date={race.date} time={race.time} /></td>
                <td><span className={phaseClass(race.phase)}>{phaseLabel(race.phase)}</span></td>
                <td>{race.winner ?? "—"}</td>
                <td>{race.pole ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthBoard({ races, season }: { races: CalendarRace[]; season: number }) {
  const groups = new Map<string, CalendarRace[]>();
  for (const race of races) {
    const key = race.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), race]);
  }
  return (
    <div className="month-board">
      {[...groups.entries()].map(([key, items]) => {
        const [year, month] = key.split("-").map(Number);
        const lead = leadingBlanks(year, month);
        const days = daysInMonth(year, month);
        const byDay = new Map(items.map((race) => [Number(race.date.slice(8, 10)), race]));
        return (
          <section key={key} className="card">
            <h3>{monthLabel(year, month)}</h3>
            <div className="month-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="dow">{day}</div>)}
              {Array.from({ length: lead }, (_, index) => <div key={`b${index}`} />)}
              {Array.from({ length: days }, (_, index) => {
                const race = byDay.get(index + 1);
                return (
                  <div key={index + 1} className={race ? "day has" : "day"}>
                    <span>{index + 1}</span>
                    {race ? <Link href={racePath(season, race.round)}>{shortRace(race.name)}</Link> : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
