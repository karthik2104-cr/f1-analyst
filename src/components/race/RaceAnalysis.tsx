"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GroupedBars, LapChart, PitScatter, PositionChart } from "@/components/charts/Charts";
import { Definitions, MetaBar, PageHeader } from "@/components/ui/Chrome";
import { LocalTime } from "@/components/ui/Time";
import { driverColor } from "@/lib/f1/colors";
import { classificationOf, representativeLaps } from "@/lib/f1/analytics";
import { formatPoints, parseLapTime } from "@/lib/f1/format";
import type { RaceDetailModel } from "@/lib/f1/models";
import { driverPath } from "@/lib/f1/routes";
import { DEFINITIONS } from "@/lib/f1/source";

const TABS = ["Classification", "Qualifying", "Pace", "Pit stops"] as const;

export function RaceAnalysis({ model }: { model: RaceDetailModel }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Classification");
  const [constructorId, setConstructorId] = useState("all");
  const [hideSlow, setHideSlow] = useState(false);
  const maxLap = model.laps.reduce((max, lap) => Math.max(max, lap.lap), 1);
  const [fromLap, setFromLap] = useState(1);
  const [toLap, setToLap] = useState(maxLap);
  const classified = model.results.filter((row) => row.position != null).slice(0, 6).map((row) => row.driver.id);
  const [picked, setPicked] = useState<string[]>(classified.length ? classified : model.drivers.slice(0, 6).map((driver) => driver.id));
  const constructors = [...new Map(model.drivers.map((driver) => [driver.constructorId, driver.constructorName])).entries()];
  const visibleDrivers = model.drivers.filter((driver) => constructorId === "all" || driver.constructorId === constructorId);
  const active = visibleDrivers.filter((driver) => picked.includes(driver.id));
  const colorFor = (id: string) => {
    const index = model.drivers.findIndex((driver) => driver.id === id);
    return driverColor(Math.max(index, 0));
  };

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  const lapRows = useMemo(() => {
    const allowed = new Set(active.map((driver) => driver.id));
    const byLap = new Map<number, Record<string, string | number | null>>();
    const secondsByDriver = new Map<string, number[]>();
    for (const lap of model.laps) {
      if (!allowed.has(lap.driverId) || lap.lap < fromLap || lap.lap > toLap || lap.seconds == null) continue;
      const list = secondsByDriver.get(lap.driverId) ?? [];
      list.push(lap.seconds);
      secondsByDriver.set(lap.driverId, list);
    }
    const keep = new Map<string, Set<number>>();
    if (hideSlow) {
      for (const [id, seconds] of secondsByDriver) keep.set(id, new Set(representativeLaps(seconds)));
    }
    for (const lap of model.laps) {
      if (!allowed.has(lap.driverId) || lap.lap < fromLap || lap.lap > toLap) continue;
      if (hideSlow && lap.seconds != null && !keep.get(lap.driverId)?.has(lap.seconds)) continue;
      const row = byLap.get(lap.lap) ?? { lap: lap.lap, x: lap.lap, label: `Lap ${lap.lap}` };
      row[`${lap.driverId}-pos`] = lap.position;
      row[`${lap.driverId}-time`] = lap.seconds;
      byLap.set(lap.lap, row);
    }
    return [...byLap.values()].sort((a, b) => Number(a.lap) - Number(b.lap));
  }, [active, fromLap, hideSlow, model.laps, toLap]);

  const series = active.map((driver) => ({ key: driver.id, name: driver.code ?? driver.name, color: colorFor(driver.id) }));

  return (
    <>
      <PageHeader
        kicker={`Season ${model.season} · Round ${model.round}`}
        title={model.race.name}
        description={`${model.race.circuit.name} · ${model.race.circuit.locality ?? ""}, ${model.race.circuit.country ?? ""}`}
        crumbs={[{ href: `/?season=${model.season}`, label: "Overview" }, { href: `/races?season=${model.season}`, label: "Race analysis" }]}
        actions={
          <label className="field">Round
            <select className="control" aria-label="Round" value={model.round} onChange={(event) => router.push(`/races/${model.season}/${event.target.value}`)}>
              {model.rounds.map((round) => <option key={round.round} value={round.round}>R{round.round} {round.name}</option>)}
            </select>
          </label>
        }
      />
      <MetaBar meta={model.meta} />
      <p><LocalTime date={model.race.date} time={model.race.time} /></p>
      <div className="session-list">
        {sessionRows(model).map((session) => (
          <div key={session.label} style={{ display: "contents" }}>
            <span className="note">{session.label}</span>
            <span>{session.value}</span>
          </div>
        ))}
      </div>
      <div className="filters" role="tablist" aria-label="Race sections">
        {TABS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "chip chip-on" : "chip"} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>
      <div className="toolbar">
        <label className="field">Constructor
          <select className="control" value={constructorId} onChange={(event) => setConstructorId(event.target.value)}>
            <option value="all">All</option>
            {constructors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="field">From lap<input className="control" type="number" min={1} max={maxLap} value={fromLap} onChange={(event) => setFromLap(Number(event.target.value) || 1)} /></label>
        <label className="field">To lap<input className="control" type="number" min={1} max={maxLap} value={toLap} onChange={(event) => setToLap(Number(event.target.value) || maxLap)} /></label>
        <button type="button" className={hideSlow ? "chip chip-on" : "chip"} aria-pressed={hideSlow} onClick={() => setHideSlow((value) => !value)}>107% lap filter</button>
      </div>
      <div className="check-grid">
        {visibleDrivers.map((driver) => (
          <button key={driver.id} type="button" className={picked.includes(driver.id) ? "chip chip-on" : "chip"} aria-pressed={picked.includes(driver.id)} onClick={() => toggle(driver.id)}>
            {driver.code ?? driver.name}
          </button>
        ))}
      </div>
      <p className="note">Insights cover the full classification. Charts and the highlighted drivers follow these filters.</p>

      {tab === "Classification" ? <Classification model={model} activeIds={new Set(active.map((driver) => driver.id))} /> : null}
      {tab === "Qualifying" ? <Qualifying model={model} activeIds={new Set(active.map((driver) => driver.id))} /> : null}
      {tab === "Pace" ? (
        <section className="section">
          <h2>Position by lap</h2>
          <p className="note">Positions come from the lap-time sheet. A missing lap is a gap in the line.</p>
          {model.lapNote ? <p className="banner">{model.lapNote}</p> : (
            <div className="card chart-card">
              <PositionChart rows={lapRows} series={series.map((item) => ({ ...item, key: `${item.key}-pos` }))} ariaLabel="Race position by lap" />
            </div>
          )}
          <h2 style={{ marginTop: 18 }}>Lap time</h2>
          <div className="card chart-card">
            <LapChart rows={lapRows.map((row) => ({ ...row, lap: row.lap }))} series={series.map((item) => ({ ...item, key: `${item.key}-time` }))} ariaLabel="Lap time by lap" />
          </div>
        </section>
      ) : null}
      {tab === "Pit stops" ? <PitStops model={model} activeIds={new Set(active.map((driver) => driver.id))} colorFor={colorFor} /> : null}

      <section className="section">
        <h2>What this race supports</h2>
        <ul>
          {model.insights.map((line) => <li key={line}>{line}</li>)}
          {!model.insights.length ? <li>No classification insights are available yet.</li> : null}
        </ul>
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Not in this dataset</h3>
          <ul>
            <li>Tyre compounds and stints are not published in the Jolpica results, lap, or pit-stop feeds.</li>
            <li>Sector times. Lap records here are a single lap time and a race position.</li>
            <li>Car telemetry. FastF1 is not connected.</li>
            <li>Sprint qualifying classification. The sprint session time may be on the schedule, but a separate classification is not loaded.</li>
          </ul>
        </div>
      </section>
      <Definitions items={[
        { term: "Places gained", detail: DEFINITIONS.placesFromGrid },
        { term: "107% filter", detail: DEFINITIONS.lapFilter },
        { term: "Classified", detail: DEFINITIONS.classified },
      ]} />
    </>
  );
}

function sessionRows(model: RaceDetailModel) {
  const sessions = [
    ["Practice 1", model.race.sessions.fp1],
    ["Practice 2", model.race.sessions.fp2],
    ["Practice 3", model.race.sessions.fp3],
    ["Qualifying", model.race.sessions.qualifying],
    ["Sprint qualifying", model.race.sessions.sprintQualifying],
    ["Sprint", model.race.sessions.sprint],
    ["Race", model.race.sessions.race],
  ] as const;
  return sessions.flatMap(([label, session]) => (session ? [{ label, value: `${session.date} ${session.time ?? "time not published"}` }] : []));
}

function placeChange(grid: number | null, finish: number | null, status: string, positionText: string): string {
  if (grid == null || finish == null || classificationOf(status, positionText) !== "classified") return "—";
  const delta = grid - finish;
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta} gained` : `${delta} lost`;
}

function Classification({ model, activeIds }: { model: RaceDetailModel; activeIds: Set<string> }) {
  const rows = model.results.filter((row) => activeIds.size === 0 || activeIds.has(row.driver.id));
  return (
    <section className="section">
      <h2>Race result</h2>
      {model.phase !== "completed" ? <p className="banner">This grand prix does not have a published race classification yet. Scheduled times above are not results.</p> : null}
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Race classification</caption>
            <thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th className="num">Grid</th><th className="num">Change</th><th className="num">Laps</th><th>Time / gap</th><th className="num">Points</th><th>Status</th><th>Fastest lap</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.driver.id}>
                  <td className="num">{row.positionText || row.position || "—"}</td>
                  <td><Link className="table-link" href={driverPath(model.season, row.driver.id)}>{row.driver.name}</Link></td>
                  <td>{row.constructor.name}</td>
                  <td className="num">{row.pitLaneStart ? "PL" : row.grid ?? "—"}</td>
                  <td className="num">{placeChange(row.grid, row.position, row.status, row.positionText)}</td>
                  <td className="num">{row.laps}</td>
                  <td className="mono">{row.time ?? "—"}</td>
                  <td className="num">{formatPoints(row.points)}</td>
                  <td>{row.status}</td>
                  <td className="mono">{row.fastestLapTime ? `${row.fastestLapTime}${row.fastestLapLap ? ` / L${row.fastestLapLap}` : ""}` : "—"}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={10}>No classification rows match the filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card chart-card" style={{ marginTop: 12 }}>
        <h3>Grid versus finish</h3>
        <p className="note">Classified finishers with a published grid only. Pit-lane starts are omitted rather than plotted as zero. Lap times elsewhere on this page are timing rows, not car telemetry.</p>
        <GroupedBars
          rows={rows.flatMap((row) => (row.grid == null || row.position == null || classificationOf(row.status, row.positionText) !== "classified" ? [] : [{ label: row.driver.code ?? row.driver.familyName, grid: row.grid, finish: row.position }]))}
          series={[{ key: "grid", name: "Grid", color: "#F5B942" }, { key: "finish", name: "Finish", color: "#E10600" }]}
          ariaLabel="Starting grid and classified finish"
        />
      </div>
      {model.sprint.length ? (
        <>
          <h2 style={{ marginTop: 18 }}>Sprint result</h2>
          <div className="card">
            <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Sprint classification</caption>
              <thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th className="num">Points</th><th>Status</th></tr></thead>
              <tbody>
                {model.sprint.filter((row) => activeIds.has(row.driver.id)).map((row) => (
                  <tr key={row.driver.id}><td>{row.positionText || "—"}</td><td>{row.driver.name}</td><td>{row.constructor.name}</td><td className="num">{formatPoints(row.points)}</td><td>{row.status}</td></tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      ) : model.race.sessions.sprint ? <p className="note">A sprint is on the schedule, but no sprint classification was returned.</p> : null}
    </section>
  );
}

function Qualifying({ model, activeIds }: { model: RaceDetailModel; activeIds: Set<string> }) {
  const rows = model.qualifying.filter((row) => activeIds.has(row.driver.id));
  const pole = parseLapTime(model.qualifying.find((row) => row.position === 1)?.q3 ?? null);
  return (
    <section className="section">
      <h2>Qualifying</h2>
      {!rows.length ? <p className="note">{model.phase === "upcoming" ? "Qualifying has not been published yet." : "Qualifying classification was not returned for this round."}</p> : null}
      <div className="card">
        <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Qualifying classification</caption>
          <thead><tr><th>Pos</th><th>Driver</th><th>Constructor</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Gap to pole</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const own = parseLapTime(row.q3);
              const gap = pole != null && own != null ? `+${(own - pole).toFixed(3)}` : "—";
              return <tr key={row.driver.id}><td>{row.position ?? "—"}</td><td>{row.driver.name}</td><td>{row.constructor.name}</td><td className="mono">{row.q1 ?? "—"}</td><td className="mono">{row.q2 ?? "—"}</td><td className="mono">{row.q3 ?? "—"}</td><td className="mono">{row.q3 ? gap : "—"}</td></tr>;
            })}
          </tbody>
        </table>
        </div>
      </div>
      <p className="note">Gap to pole is calculated only from Q3 times, so drivers who did not reach Q3 are left blank.</p>
    </section>
  );
}

function PitStops({ model, activeIds, colorFor }: { model: RaceDetailModel; activeIds: Set<string>; colorFor: (id: string) => string }) {
  const rows = model.pitstops.filter((pit) => activeIds.has(pit.driverId) && pit.duration != null);
  return (
    <section className="section">
      <h2>Pit stops</h2>
      {model.pitNote ? <p className="banner">{model.pitNote}</p> : null}
      <div className="card chart-card">
        <PitScatter rows={rows.map((pit) => ({ driver: pit.driverName, lap: pit.lap, duration: pit.duration ?? 0, color: colorFor(pit.driverId) }))} ariaLabel="Pit stop duration by lap" />
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Pit stops</caption>
          <thead><tr><th>Driver</th><th>Team</th><th className="num">Stop</th><th className="num">Lap</th><th className="num">Duration</th><th>Clock</th></tr></thead>
          <tbody>
            {model.pitstops.filter((pit) => activeIds.has(pit.driverId)).map((pit) => (
              <tr key={`${pit.driverId}-${pit.stop}`}><td>{pit.driverName}</td><td>{pit.constructorName}</td><td className="num">{pit.stop}</td><td className="num">{pit.lap}</td><td className="num">{pit.duration?.toFixed(3) ?? "—"}</td><td className="mono">{pit.time ?? "—"}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
