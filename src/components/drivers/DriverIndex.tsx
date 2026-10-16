"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MetaBar, PageHeader } from "@/components/ui/Chrome";
import { SortableTable, type Column } from "@/components/ui/SortableTable";
import { formatPoints } from "@/lib/f1/format";
import type { DriverIndexModel, StandingRow } from "@/lib/f1/models";

export function DriverIndex({ model }: { model: DriverIndexModel }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return model.rows.filter((row) => `${row.name} ${row.code ?? ""} ${row.team ?? ""}`.toLowerCase().includes(needle));
  }, [model.rows, query]);
  const columns: Column<StandingRow>[] = [
    { id: "position", header: "Pos", align: "right", sortValue: (row) => row.position, render: (row) => row.position },
    { id: "name", header: "Driver", sortValue: (row) => row.name, render: (row) => <Link className="table-link" href={row.href}>{row.name}</Link> },
    { id: "code", header: "Code", sortValue: (row) => row.code, render: (row) => row.code ?? "—" },
    { id: "team", header: "Team", sortValue: (row) => row.team, render: (row) => row.team ?? "—" },
    { id: "points", header: "Points", align: "right", sortValue: (row) => row.points, render: (row) => formatPoints(row.points) },
    { id: "wins", header: "Wins", align: "right", sortValue: (row) => row.wins, render: (row) => row.wins },
    { id: "podiums", header: "Podiums", align: "right", sortValue: (row) => row.podiums, render: (row) => row.podiums ?? "—" },
    { id: "poles", header: "Poles", align: "right", sortValue: (row) => row.poles, render: (row) => row.poles ?? "—" },
    { id: "starts", header: "Starts", align: "right", sortValue: (row) => row.starts, render: (row) => row.starts ?? "—" },
  ];
  return (
    <>
      <PageHeader kicker={`Season ${model.season}`} title="Drivers" description="Open a driver for season form, teammate comparison, and the standings history returned for that driver." />
      <MetaBar meta={model.meta} />
      <div className="toolbar">
        <label className="field">Search<input className="control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, code, team" /></label>
        <p className="note">Average finish is on the profile. {rows.length} drivers in the standings.</p>
      </div>
      <div className="card">
        <SortableTable rows={rows} columns={columns} caption="Driver index" initialSort={{ id: "position", direction: "asc" }} getKey={(row) => row.id} />
      </div>
      <p className="note">Drivers without a standings row are omitted from this index. A profile is still available from search when they have a result.</p>
    </>
  );
}
