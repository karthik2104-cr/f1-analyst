"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PointsChart } from "@/components/charts/Charts";
import { Definitions, Delta, MetaBar, PageHeader } from "@/components/ui/Chrome";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { formatPoints } from "@/lib/f1/format";
import type { StandingRow, StandingsModel } from "@/lib/f1/models";
import { DEFINITIONS } from "@/lib/f1/source";

export function StandingsView({ model, initialView }: { model: StandingsModel; initialView: "drivers" | "constructors" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState(initialView);
  const [query, setQuery] = useState("");
  const rows = view === "drivers" ? model.drivers : model.constructors;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => `${row.name} ${row.team ?? ""} ${row.code ?? ""}`.toLowerCase().includes(needle));
  }, [query, rows]);

  function switchView(next: "drivers" | "constructors") {
    setView(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const leader = [...rows].sort((a, b) => a.position - b.position)[0];
  const leaderPoints = leader?.points ?? null;
  const columns: Column<StandingRow>[] = [
    { id: "position", header: "Pos", align: "right", sortValue: (row) => row.position, render: (row) => row.position },
    ...(model.showDelta ? [{ id: "delta", header: "+/-", align: "right" as const, sortValue: (row: StandingRow) => (typeof row.delta === "number" ? row.delta : null), render: (row: StandingRow) => <Delta value={row.delta} /> }] : []),
    { id: "name", header: view === "drivers" ? "Driver" : "Constructor", sortValue: (row) => row.name, render: (row) => <Link className="table-link" href={row.href}>{row.name}</Link> },
    { id: "team", header: view === "drivers" ? "Team" : "Nationality", sortValue: (row) => row.team, render: (row) => row.team ?? "—" },
    { id: "points", header: "Points", align: "right", sortValue: (row) => row.points, render: (row) => formatPoints(row.points) },
    {
      id: "gap",
      header: "Gap",
      align: "right",
      sortValue: (row) => (leaderPoints == null ? null : leaderPoints - row.points),
      render: (row) => {
        if (leaderPoints == null) return "—";
        if (row.position === 1) return "Leader";
        const gap = leaderPoints - row.points;
        return gap === 0 ? "0" : <span>−{formatPoints(gap)} <span className="sr-only">behind the leader</span></span>;
      },
    },
    { id: "wins", header: "Wins", align: "right", sortValue: (row) => row.wins, render: (row) => row.wins },
    { id: "podiums", header: "Podiums", align: "right", sortValue: (row) => row.podiums, render: (row) => row.podiums ?? "—" },
    ...(view === "drivers"
      ? [
          { id: "poles", header: "Poles", align: "right" as const, sortValue: (row: StandingRow) => row.poles, render: (row: StandingRow) => row.poles ?? "—" },
          { id: "fl", header: "FL", align: "right" as const, sortValue: (row: StandingRow) => row.fastestLaps, render: (row: StandingRow) => row.fastestLaps ?? "—" },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        kicker={`Season ${model.season}`}
        title="Championship standings"
        description={model.meta.standingsRound ? `Published after round ${model.meta.standingsRound}. Gap is points behind the leader.` : "Standings round was not included in the feed."}
        crumbs={[{ href: `/?season=${model.season}`, label: "Overview" }, { href: `/standings?season=${model.season}`, label: "Standings" }]}
      />
      <MetaBar meta={model.meta} />
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Standings type">
          <button type="button" className={view === "drivers" ? "chip chip-on" : "chip"} aria-pressed={view === "drivers"} onClick={() => switchView("drivers")}>Drivers</button>
          <button type="button" className={view === "constructors" ? "chip chip-on" : "chip"} aria-pressed={view === "constructors"} onClick={() => switchView("constructors")}>Constructors</button>
        </div>
        <label className="field">Search
          <input className="control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or team" />
        </label>
        <p className="note">{filtered.length} shown</p>
      </div>
      <div className="card">
        <SortableTable rows={filtered} columns={columns} caption={`${view} standings`} initialSort={{ id: "position", direction: "asc" }} getKey={(row) => row.id} />
      </div>
      <section className="section">
        <h2>{view === "drivers" ? "Driver" : "Constructor"} points</h2>
        <p className="note">{view === "drivers" ? model.progressionNote : model.constructorProgressionNote}</p>
        <div className="card chart-card">
          <PointsChart series={view === "drivers" ? model.driverProgression : model.constructorProgression} ariaLabel="Points progression" />
        </div>
      </section>
      <Definitions items={[
        { term: "Points", detail: "Official championship points from the standings feed." },
        { term: "Podiums", detail: view === "drivers" ? DEFINITIONS.podiums : "Classified grand prix results in positions 1, 2, or 3 for this constructor. Two cars on the same podium count as two results." },
        { term: "Poles", detail: DEFINITIONS.poles },
        { term: "Position change", detail: DEFINITIONS.positionDelta },
        { term: "Chart", detail: DEFINITIONS.sessionPoints },
      ]} />
    </>
  );
}
