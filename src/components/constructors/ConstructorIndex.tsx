"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PointsChart } from "@/components/charts/Charts";
import { MetaBar, PageHeader } from "@/components/ui/Chrome";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { formatPoints } from "@/lib/f1/format";
import type { ConstructorIndexModel, StandingRow } from "@/lib/f1/models";

export function ConstructorIndex({ model }: { model: ConstructorIndexModel }) {
  const [query, setQuery] = useState("");
  const [left, setLeft] = useState(model.rows[0]?.id ?? "");
  const [right, setRight] = useState(model.rows[1]?.id ?? model.rows[0]?.id ?? "");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return model.rows.filter((row) => `${row.name} ${row.team ?? ""}`.toLowerCase().includes(needle));
  }, [model.rows, query]);
  const columns: Column<StandingRow>[] = [
    { id: "position", header: "Pos", align: "right", sortValue: (row) => row.position, render: (row) => row.position },
    { id: "name", header: "Constructor", sortValue: (row) => row.name, render: (row) => <Link className="table-link" href={row.href}>{row.name}</Link> },
    { id: "points", header: "Points", align: "right", sortValue: (row) => row.points, render: (row) => formatPoints(row.points) },
    { id: "wins", header: "Wins", align: "right", sortValue: (row) => row.wins, render: (row) => row.wins },
    { id: "podiums", header: "Podium results", align: "right", sortValue: (row) => row.podiums, render: (row) => row.podiums ?? "—" },
  ];
  const series = model.progression.filter((item) => item.id === left || item.id === right);

  return (
    <>
      <PageHeader kicker={`Season ${model.season}`} title="Constructors" description="Official standings, with podium results counted from classified race rows." />
      <MetaBar meta={model.meta} />
      <div className="toolbar">
        <label className="field">Search<input className="control" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      <div className="card"><SortableTable rows={rows} columns={columns} caption="Constructor standings" initialSort={{ id: "position", direction: "asc" }} getKey={(row) => row.id} /></div>
      <section className="section">
        <h2>Compare two constructors</h2>
        <div className="toolbar">
          <label className="field">Left<select className="control" value={left} onChange={(event) => setLeft(event.target.value)}>{model.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="field">Right<select className="control" value={right} onChange={(event) => setRight(event.target.value)}>{model.rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        </div>
        <CompareStrip model={model} left={left} right={right} />
        <div className="card chart-card"><PointsChart series={series} ariaLabel="Selected constructor points" /></div>
        <p className="note">{model.progressionNote}</p>
      </section>
    </>
  );
}

function CompareStrip({ model, left, right }: { model: ConstructorIndexModel; left: string; right: string }) {
  const a = model.rows.find((row) => row.id === left);
  const b = model.rows.find((row) => row.id === right);
  if (!a || !b) return <p className="note">Choose two constructors from the published standings.</p>;
  const lines = [
    ["Points", formatPoints(a.points), formatPoints(b.points)],
    ["Wins", String(a.wins), String(b.wins)],
    ["Podium results", a.podiums == null ? "—" : String(a.podiums), b.podiums == null ? "—" : String(b.podiums)],
  ];
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <table className="data">
        <caption className="sr-only">Constructor comparison</caption>
        <thead><tr><th>Metric</th><th>{a.name}</th><th>{b.name}</th></tr></thead>
        <tbody>{lines.map((line) => <tr key={line[0]}><td>{line[0]}</td><td>{line[1]}</td><td>{line[2]}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
