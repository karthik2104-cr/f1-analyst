"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MetaBar, PageHeader } from "@/components/ui/Chrome";
import type { CircuitIndexModel } from "@/lib/f1/models";

export function CircuitIndex({ model, season }: { model: CircuitIndexModel; season: string }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return model.circuits.filter((circuit) => `${circuit.name} ${circuit.country ?? ""} ${circuit.locality ?? ""}`.toLowerCase().includes(needle));
  }, [model.circuits, query]);
  return (
    <>
      <PageHeader kicker="Circuits" title="Circuit explorer" description="Location and identity come from Jolpica. Length, corners, and lap records are not in that feed, so they are not shown." />
      <MetaBar meta={model.meta} />
      <div className="toolbar">
        <label className="field">Search<input className="control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Circuit or country" /></label>
        <p className="note">{rows.length} circuits</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Circuits</caption>
            <thead><tr><th>Circuit</th><th>Locality</th><th>Country</th></tr></thead>
            <tbody>
              {rows.map((circuit) => (
                <tr key={circuit.id}>
                  <td><Link className="table-link" href={`/circuits/${circuit.id}?season=${encodeURIComponent(season)}`}>{circuit.name}</Link></td>
                  <td>{circuit.locality ?? "—"}</td>
                  <td>{circuit.country ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
