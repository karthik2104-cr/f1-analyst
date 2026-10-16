"use client";

import { useState } from "react";
import { PointsChart } from "@/components/charts/Charts";
import type { ChartSeries } from "@/lib/f1/models";

const LIMIT = 8;

export function ChampionshipLab({
  driverSeries,
  constructorSeries,
  driverNote,
  constructorNote,
}: {
  driverSeries: ChartSeries[];
  constructorSeries: ChartSeries[];
  driverNote: string;
  constructorNote: string;
}) {
  const [mode, setMode] = useState<"drivers" | "constructors">("drivers");
  const [driverIds, setDriverIds] = useState<string[]>(driverSeries.slice(0, 5).map((item) => item.id));
  const [constructorIds, setConstructorIds] = useState<string[]>(constructorSeries.slice(0, 4).map((item) => item.id));
  const seriesKey = `${driverSeries.map((item) => item.id).join("|")}::${constructorSeries.map((item) => item.id).join("|")}`;
  const [seenKey, setSeenKey] = useState(seriesKey);
  if (seriesKey !== seenKey) {
    setSeenKey(seriesKey);
    setMode("drivers");
    setDriverIds(driverSeries.slice(0, 5).map((item) => item.id));
    setConstructorIds(constructorSeries.slice(0, 4).map((item) => item.id));
  }
  const source = mode === "drivers" ? driverSeries : constructorSeries;
  const selected = new Set(mode === "drivers" ? driverIds : constructorIds);
  const visible = source.filter((item) => selected.has(item.id));
  const note = mode === "drivers" ? driverNote : constructorNote;

  function choose(next: "drivers" | "constructors") {
    setMode(next);
  }

  function toggle(id: string) {
    const update = (current: string[]) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= LIMIT) return current;
      return [...current, id];
    };
    if (mode === "drivers") setDriverIds(update);
    else setConstructorIds(update);
  }

  return (
    <div className="lab">
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Championship chart">
          <button type="button" className={mode === "drivers" ? "chip chip-on" : "chip"} aria-pressed={mode === "drivers"} onClick={() => choose("drivers")}>Drivers</button>
          <button type="button" className={mode === "constructors" ? "chip chip-on" : "chip"} aria-pressed={mode === "constructors"} onClick={() => choose("constructors")}>Constructors</button>
        </div>
        <p className="note">Session points by round. Select up to {LIMIT}. A blank stretch means that series has no point for the round.</p>
      </div>
      <div className="check-grid" role="group" aria-label={mode === "drivers" ? "Drivers on the chart" : "Constructors on the chart"}>
        {source.map((item) => (
          <button key={item.id} type="button" className={selected.has(item.id) ? "chip chip-on" : "chip"} aria-pressed={selected.has(item.id)} onClick={() => toggle(item.id)}>
            <span className="tip-swatch" style={{ background: item.color }} />
            {item.name}
          </button>
        ))}
      </div>
      {!source.length ? <p className="note">No {mode} have published session points for this season.</p> : null}
      {source.length && !visible.length ? <p className="banner">Select at least one {mode === "drivers" ? "driver" : "constructor"} to draw the progression.</p> : null}
      <PointsChart series={visible} height="hero" ariaLabel={mode === "drivers" ? "Driver championship session points by round" : "Constructor championship session points by round"} />
      <p className="note">{note} The lines show accumulated race and sprint points. They are not a claim that one change caused another.</p>
    </div>
  );
}
