"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MetricBars, PointsChart } from "@/components/charts/Charts";
import { Definitions, MetaBar, PageHeader } from "@/components/ui/Chrome";
import { betterIndex, median, representativeLaps } from "@/lib/f1/analytics";
import { formatAvg, formatPercent, formatPoints, formatSeconds } from "@/lib/f1/format";
import type { CompareModel } from "@/lib/f1/models";
import { DEFINITIONS } from "@/lib/f1/source";

function formatMetric(key: string, value: number | null): string {
  if (value == null) return "—";
  if (key === "dnf" || key === "finish") return formatPercent(value);
  if (key === "points" || key === "ppr") return formatPoints(value);
  if (key === "avgFinish" || key === "avgQuali" || key === "consistency") return formatAvg(value);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function CompareTool({ model }: { model: CompareModel }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterSlow, setFilterSlow] = useState(false);
  const selected = new Set(model.drivers.map((driver) => driver.driver.id));

  function update(next: URLSearchParams) {
    router.push(`${pathname}?${next.toString()}`);
  }

  function toggle(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    const ids = new Set(selected);
    if (ids.has(id)) ids.delete(id);
    else if (ids.size < 4) ids.add(id);
    params.set("drivers", [...ids].join(","));
    params.set("season", String(model.season));
    update(params);
  }

  function setRound(round: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (round) params.set("round", round);
    else params.delete("round");
    params.set("season", String(model.season));
    update(params);
  }

  const pace = useMemo(() => {
    if (!model.lapSamples) return [];
    return model.lapSamples.map((sample) => {
      const used = filterSlow ? representativeLaps(sample.seconds) : sample.seconds;
      return { ...sample, used: used.length, median: median(used) };
    });
  }, [filterSlow, model.lapSamples]);

  return (
    <>
      <PageHeader
        kicker={`Season ${model.season}`}
        title="Comparison laboratory"
        description="Choose two to four drivers who appear in this season. Missing values stay blank. Sprint points are not mixed into race points per start."
        crumbs={[{ href: `/?season=${model.season}`, label: "Overview" }, { href: `/compare?season=${model.season}`, label: "Compare" }]}
      />
      <MetaBar meta={model.meta} />
      <div className="check-grid" role="group" aria-label="Drivers to compare">
        {model.directory.map((driver) => (
          <button key={driver.id} type="button" className={selected.has(driver.id) ? "chip chip-on" : "chip"} aria-pressed={selected.has(driver.id)} onClick={() => toggle(driver.id)}>
            {driver.code ? `${driver.code} ` : ""}{driver.name}
          </button>
        ))}
      </div>
      {model.drivers.length < 2 ? <p className="banner">Select at least two drivers. The comparison does not fill missing drivers with estimated results.</p> : null}
      {model.drivers.length ? (
        <div className="identity-row">
          {model.drivers.map((driver) => (
            <article key={driver.driver.id} className="profile-head">
              <div>
                <p className="kicker">{driver.position ? `P${driver.position}` : "Unranked"} · {driver.driver.code ?? driver.driver.number ?? "—"}</p>
                <h2><Link href={driver.href}>{driver.driver.name}</Link></h2>
                <p className="note">{driver.team ?? "Team unavailable"} · {driver.driver.nationality ?? "Nationality unavailable"}</p>
                <p className="stat-value">{formatPoints(driver.officialPoints)}</p>
                <p className="note">{driver.officialPoints != null ? "Championship points" : "No standings row for this driver"}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {model.drivers.length >= 2 ? (
        <section className="section">
          <h2>Paired metrics</h2>
          <p className="note">Bar length shows the size of the value. “Best” marks the unique better result and does not imply a cause. A blank value was not recorded.</p>
          <div className="card">
            {model.metrics.filter((metric) => ["points", "ppr", "wins", "podiums", "poles", "fastest", "avgQuali", "avgFinish", "finish", "dnf"].includes(metric.key)).map((metric) => (
              <MetricBars
                key={metric.key}
                label={metric.label}
                definition={metric.definition}
                lowerBetter={metric.lowerBetter}
                rows={model.drivers.map((driver, index) => ({
                  name: driver.driver.code ?? driver.driver.familyName,
                  color: driver.color,
                  value: metric.values[index],
                  text: formatMetric(metric.key, metric.values[index]),
                }))}
              />
            ))}
          </div>
        </section>
      ) : null}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="table-wrap">
          <table className="data">
            <caption className="sr-only">Season comparison</caption>
            <thead>
              <tr>
                <th>Metric</th>
                {model.drivers.map((driver) => <th key={driver.driver.id}><Link className="table-link" href={driver.href}>{driver.driver.name}</Link><div className="note">{driver.team ?? "Team unavailable"}{driver.position ? ` · P${driver.position}` : ""}</div></th>)}
              </tr>
            </thead>
            <tbody>
              {model.metrics.map((metric) => {
                const best = metric.comparable ? betterIndex(metric.values, metric.lowerBetter) : null;
                return (
                  <tr key={metric.key}>
                    <th scope="row" title={metric.definition}>{metric.label}</th>
                    {metric.values.map((value, index) => (
                      <td key={`${metric.key}-${index}`} className={best === index ? "is-better" : undefined}>
                        {formatMetric(metric.key, value)}
                        {best === index ? <span className="sr-only"> better</span> : null}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <section className="section">
        <h2>Head to head</h2>
        <p className="note">{DEFINITIONS.headToHeadRace} {DEFINITIONS.headToHeadQuali}</p>
        {model.pairs.length ? model.pairs.map((pair) => (
          <article key={`${pair.a}-${pair.b}`} className="card" style={{ marginTop: 10 }}>
            <h3>{pair.a} vs {pair.b}</h3>
            <p>Qualifying {pair.qualiA}-{pair.qualiB}{pair.qualiTied ? `, ${pair.qualiTied} tied` : ""} across {pair.qualiCompared} rounds.</p>
            <p>Race finishes {pair.raceA}-{pair.raceB}{pair.raceTied ? `, ${pair.raceTied} tied` : ""} across {pair.raceCompared} decisive rounds.</p>
          </article>
        )) : <p className="note">Head-to-head records appear once two drivers are selected.</p>}
      </section>
      <section className="section">
        <h2>Session points</h2>
        <p className="note">{model.progressionNote}</p>
        <div className="card chart-card"><PointsChart series={model.progression} ariaLabel="Compared driver points" /></div>
      </section>
      <section className="section">
        <h2>Lap pace</h2>
        <p className="note">{DEFINITIONS.medianLap} {DEFINITIONS.lapFilter} Sector times are not in the Jolpica lap feed.</p>
        <div className="toolbar">
          <label className="field">Round
            <select className="control" value={model.selectedRound ?? ""} onChange={(event) => setRound(event.target.value)}>
              <option value="">No round selected</option>
              {model.rounds.map((round) => <option key={round.round} value={round.round}>R{round.round} {round.name}</option>)}
            </select>
          </label>
          <label className="field">Display
            <button type="button" className={filterSlow ? "chip chip-on" : "chip"} aria-pressed={filterSlow} onClick={() => setFilterSlow((value) => !value)}>Hide laps slower than 107% of each median</button>
          </label>
        </div>
        {model.lapNote ? <p className="note">{model.lapNote}</p> : null}
        {pace.length ? (
          <div className="card">
            <table className="data">
              <caption className="sr-only">Median lap times</caption>
              <thead><tr><th>Driver</th><th className="num">Laps used</th><th className="num">Laps published</th><th className="num">Median</th></tr></thead>
              <tbody>
                {pace.map((row) => (
                  <tr key={row.driverId}><td>{row.name}</td><td className="num">{row.used}</td><td className="num">{row.seconds.length}</td><td className="num mono">{formatSeconds(row.median)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      <Definitions items={[
        { term: "Average finish", detail: DEFINITIONS.avgFinish },
        { term: "DNF rate", detail: DEFINITIONS.dnfRate },
        { term: "Finish spread", detail: DEFINITIONS.consistency },
        { term: "Highlighted cell", detail: "The unique better value is marked. Ties are not highlighted. Lower is better for average finish, average qualifying, DNF rate, and finish spread." },
      ]} />
    </>
  );
}
