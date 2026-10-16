import Link from "next/link";
import { BarSet, PointsChart, PositionChart } from "@/components/charts/Charts";
import { Definitions, DriverMark, MetaBar, PageHeader, Section, Stat } from "@/components/ui/Chrome";
import { PathSelect } from "@/components/ui/Controls";
import { formatAvg, formatPercent, formatPoints, formatRaceDate, formatSigned } from "@/lib/f1/format";
import type { DriverProfileModel } from "@/lib/f1/models";
import { driverPath } from "@/lib/f1/routes";
import { DEFINITIONS } from "@/lib/f1/source";
import { driverColor } from "@/lib/f1/colors";

export function DriverView({ model }: { model: DriverProfileModel }) {
  const label = model.driver.code ?? model.driver.familyName.slice(0, 3).toUpperCase();
  const finishRows = model.rounds.map((round) => ({ x: round.round, label: round.label, finish: round.finish, quali: round.quali, grid: round.grid }));
  return (
    <>
      <PageHeader
        kicker={`Season ${model.season}`}
        title={model.driver.name}
        description={[model.driver.nationality, model.team?.name, model.driver.dateOfBirth ? `Born ${formatRaceDate(model.driver.dateOfBirth)}` : null].filter(Boolean).join(" · ")}
        crumbs={[{ href: `/?season=${model.season}`, label: "Overview" }, { href: `/drivers?season=${model.season}`, label: "Drivers" }]}
        actions={<PathSelect label="Driver" value={model.driver.id} options={model.directory.map((driver) => ({ value: driver.id, label: driver.name, href: driverPath(model.season, driver.id) }))} />}
      />
      <MetaBar meta={model.meta} />
      <div className="profile-head" style={{ marginBottom: 14 }}>
        <DriverMark label={label} number={model.driver.number} color={driverColor(0)} />
        <div>
          <p className="kicker">{model.standing ? `P${model.standing.position} · ${formatPoints(model.standing.points)} pts` : "Unranked in this season's standings"}</p>
          <h2>{model.team?.name ?? "Team not listed"}</h2>
          <p className="note">{model.driver.nationality ?? "Nationality unavailable"}{model.driver.number ? ` · No. ${model.driver.number}` : ""}</p>
          {model.driver.url ? <p><a href={model.driver.url} target="_blank" rel="noreferrer">Wikipedia reference</a></p> : null}
        </div>
      </div>
      <div className="grid-stats">
        <Stat label={model.pointsLabel} value={formatPoints(model.pointsValue)} detail={model.standing ? `${model.standing.wins} standings wins` : "No standings row"} />
        <Stat label="Wins" value={String(model.stats.wins)} detail={DEFINITIONS.wins} />
        <Stat label="Podiums" value={String(model.stats.podiums)} />
        <Stat label="Poles" value={String(model.stats.poles)} />
        <Stat label="Fastest laps" value={String(model.stats.fastestLaps)} />
        <Stat label="Starts" value={String(model.stats.starts)} detail={`Avg finish ${formatAvg(model.stats.avgFinish)}`} />
      </div>
      {model.pointsNote ? <p className="banner">{model.pointsNote}</p> : null}
      <Section title="Trend">
        <ul>{model.trend.map((line) => <li key={line}>{line}</li>)}</ul>
      </Section>
      <div className="grid-2">
        <Section title="Session points" description={DEFINITIONS.sessionPoints}>
          <div className="card chart-card"><PointsChart series={model.progression} ariaLabel="Driver session points by round" /></div>
        </Section>
        <Section title="Finish distribution" description="Grouped from classified positions. Retirements are not assigned a finishing place.">
          <div className="card chart-card"><BarSet rows={model.distribution.map((item) => ({ label: item.label, value: item.count }))} label="Results" ariaLabel="Finish distribution" /></div>
        </Section>
      </div>
      <Section title="Grid, qualifying, and finish" description="Lower on the chart is a better position. Unclassified races leave a gap instead of a finish. A missing grid is a pit-lane start or an unpublished grid, not position zero.">
        <div className="card chart-card">
          <PositionChart
            rows={finishRows}
            series={[{ key: "quali", name: "Qualifying", color: "#5B9DFF" }, { key: "grid", name: "Grid", color: "#F5B942" }, { key: "finish", name: "Finish", color: "#E10600" }]}
            ariaLabel="Qualifying and race position by round"
          />
        </div>
        <p className="note">Average qualifying {formatAvg(model.stats.avgQuali)} · Places from qualifying {model.stats.avgPlacesFromQuali == null ? "—" : formatSigned(model.stats.avgPlacesFromQuali)} · Places from grid {model.stats.avgPlacesFromGrid == null ? "—" : formatSigned(model.stats.avgPlacesFromGrid)}</p>
      </Section>
      <Section title="Recent grands prix">
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Recent results</caption>
              <thead><tr><th>Rnd</th><th>Race</th><th>Team</th><th className="num">Quali</th><th className="num">Grid</th><th className="num">Finish</th><th>Status</th><th>Sprint</th><th className="num">Pts</th></tr></thead>
              <tbody>
                {model.recent.map((row) => (
                  <tr key={row.round}>
                    <td className="num">{row.round}</td>
                    <td><Link className="table-link" href={`/races/${model.season}/${row.round}`}>{row.name}</Link></td>
                    <td>{row.constructorName}</td>
                    <td className="num">{row.quali ?? "—"}</td>
                    <td className="num">{row.grid ?? "—"}</td>
                    <td className="num">{row.finish ?? row.positionText}</td>
                    <td>{row.status}</td>
                    <td>{row.sprintPosition ?? "—"}</td>
                    <td className="num">{formatPoints(row.points)}</td>
                  </tr>
                ))}
                {!model.recent.length ? <tr><td colSpan={9}>No race results in this season.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <Section title="Teammates" description={model.team ? `${DEFINITIONS.teammateShare} Constructor session points: ${model.teamSessionPoints == null ? "—" : formatPoints(model.teamSessionPoints)}. This driver's share: ${formatPercent(model.driverTeamShare)}.` : "No constructor was found for this driver in the selected season."}>
        {model.teammates.length ? model.teammates.map((teammate) => (
          <div key={teammate.driver.id} className="card" style={{ marginBottom: 10 }}>
            <h3><Link href={driverPath(model.season, teammate.driver.id)}>{teammate.driver.name}</Link></h3>
            <p>Race head-to-head {teammate.raceAhead}-{teammate.raceBehind} across {teammate.raceCompared} decisive rounds. Qualifying {teammate.qualiAhead}-{teammate.qualiBehind} across {teammate.qualiCompared} rounds.</p>
            <p className="note">Teammate session points for the team {formatPoints(teammate.sessionPoints)} ({formatPercent(teammate.share)}) · average classified finish {formatAvg(teammate.avgFinish)}.</p>
          </div>
        )) : <p className="note">No teammate with published results shares this constructor entry.</p>}
      </Section>
      <Section title="Career standings" description={model.careerNote}>
        <div className="card chart-card">
          <PositionChart
            rows={model.career.map((row) => ({ x: row.season, label: String(row.season), position: row.position }))}
            series={[{ key: "position", name: "Championship position", color: "#ff4d4d" }]}
            ariaLabel="Championship position by season"
          />
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Season standings history</caption>
              <thead><tr><th>Season</th><th>Team</th><th className="num">Pos</th><th className="num">Points</th><th className="num">Wins</th><th className="num">Rounds</th></tr></thead>
              <tbody>
                {[...model.career].reverse().map((row) => (
                  <tr key={row.season}><td>{row.season}</td><td>{row.teams}</td><td className="num">{row.position}</td><td className="num">{formatPoints(row.points)}</td><td className="num">{row.wins}</td><td className="num">{row.round || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <Definitions items={[
        { term: "Average finish", detail: DEFINITIONS.avgFinish },
        { term: "Poles", detail: DEFINITIONS.poles },
        { term: "DNF rate", detail: `${DEFINITIONS.dnfRate} Current rate ${formatPercent(model.stats.dnfRate)}.` },
        { term: "Finish rate", detail: `${DEFINITIONS.finishRate} Current rate ${formatPercent(model.stats.finishRate)}.` },
        { term: "Consistency", detail: `${DEFINITIONS.consistency} Current value ${formatAvg(model.stats.consistency)}.` },
        { term: "Halves", detail: DEFINITIONS.finishHalves },
        { term: "Head to head", detail: DEFINITIONS.headToHeadRace },
      ]} />
    </>
  );
}
