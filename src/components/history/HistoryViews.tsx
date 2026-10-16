import Link from "next/link";
import { GapChart } from "@/components/charts/Charts";
import { Definitions, MetaBar, PageHeader, Section } from "@/components/ui/Chrome";
import { formatPercent, formatPoints } from "@/lib/f1/format";
import { historyLeaders } from "@/lib/f1/present";
import type { CircuitModel, HistoryModel } from "@/lib/f1/models";
import type { SeasonBattle } from "@/lib/f1/analytics";
import { DEFINITIONS } from "@/lib/f1/source";

export function CircuitDetail({ model }: { model: CircuitModel }) {
  const latest = model.winners[0];
  const map = model.circuit.lat != null && model.circuit.lng != null ? osm(model.circuit.lat, model.circuit.lng) : null;
  return (
    <>
      <PageHeader kicker={model.circuit.country ?? "Circuit"} title={model.circuit.name} description={[model.circuit.locality, model.circuit.country].filter(Boolean).join(", ")} />
      <MetaBar meta={model.meta} />
      <p className="note">{DEFINITIONS.circuitSpecs}</p>
      <div className="grid-2" style={{ marginTop: 14 }}>
        <article className="card">
          <h2>This season</h2>
          {model.seasonEvent ? (
            <p><Link href={`/races/${model.seasonEvent.season}/${model.seasonEvent.round}`}>R{model.seasonEvent.round} {model.seasonEvent.name}</Link> · {model.seasonEvent.date} · {model.seasonEvent.phase}</p>
          ) : <p>This circuit is not on the selected season calendar.</p>}
          <h3 style={{ marginTop: 16 }}>Most recent recorded winner</h3>
          {latest ? <p><Link href={`/drivers/${latest.driverId}?season=${latest.season}`}>{latest.driver}</Link> · {latest.season} {latest.name}</p> : <p>No winning result was returned.</p>}
          {model.circuit.url ? <p style={{ marginTop: 10 }}><a href={model.circuit.url} target="_blank" rel="noreferrer">Wikipedia reference</a></p> : null}
        </article>
        <article className="card">
          {map ? <iframe className="map-frame" title={`Map showing the published coordinates for ${model.circuit.name}`} src={map} /> : <p>Coordinates were not published for this circuit.</p>}
          <p className="note">Location marker from Jolpica coordinates. This is not an official track map.</p>
        </article>
      </div>
      <Section title="Most wins in the loaded results" description={model.truncated ? "The winner list hit the pagination safety cap, so these counts are incomplete." : "Counts use recorded winning results only."}>
        <div className="card">
          <ul className="rank-list">
            {model.mostSuccessful.map((row) => <li key={row.driverId}><span className="pos">{row.wins}</span><Link href={`/drivers/${row.driverId}`}>{row.driver}</Link><span>wins</span></li>)}
          </ul>
        </div>
      </Section>
      <Section title="Recorded winners">
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Winners</caption>
              <thead><tr><th>Season</th><th>Race</th><th>Date</th><th>Driver</th><th>Constructor</th></tr></thead>
              <tbody>
                {model.winners.slice(0, 40).map((row) => (
                  <tr key={`${row.season}-${row.round}`}>
                    <td>{row.season}</td>
                    <td>{row.name}</td>
                    <td>{row.date}</td>
                    <td><Link className="table-link" href={`/drivers/${row.driverId}?season=${row.season}`}>{row.driver}</Link></td>
                    <td>{row.constructorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </>
  );
}

function osm(lat: number, lng: number) {
  const bbox = [lng - 0.12, lat - 0.08, lng + 0.12, lat + 0.08].map((value) => value.toFixed(5)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function HistoryView({ model }: { model: HistoryModel }) {
  const drivers = historyLeaders(model.drivers);
  const constructors = historyLeaders(model.constructors);
  return (
    <>
      <PageHeader
        kicker={`${model.from}–${model.to}`}
        title="Historical standings"
        description={`This window uses Jolpica standings. ${model.currentSeason} is ${model.inProgress ? "still in progress and is not called a championship" : "complete in the loaded schedule"}. Rankings below exclude in-progress seasons and are not all-time records.`}
      />
      <MetaBar meta={model.meta} />
      <form className="toolbar" action="/history" method="get">
        <label className="field">From<input className="control" name="from" defaultValue={model.from} inputMode="numeric" /></label>
        <label className="field">To<input className="control" name="to" defaultValue={model.to} inputMode="numeric" /></label>
        <button className="btn btn-primary" type="submit">Update window</button>
      </form>
      <p className="note">Up to 30 seasons. The first load of a new window requests one driver table and one constructor table per season.</p>
      {model.failed.length ? <p className="banner">Some seasons did not load: {model.failed.slice(0, 4).join("; ")}</p> : null}
      <Section title="Driver battles" description={DEFINITIONS.pointsGap}>
        <BattleTable rows={model.drivers} noun="Leader" />
        <div className="grid-2">
          <article className="card"><h3>Closest gaps</h3><Mini rows={drivers.closest} /></article>
          <article className="card"><h3>Largest gaps</h3><Mini rows={drivers.dominant} /></article>
        </div>
        <div className="card chart-card" style={{ marginTop: 12 }}>
          <GapChart rows={model.drivers.filter((row) => !row.inProgress && row.gap != null).map((row) => ({ season: row.season, gap: row.gap ?? 0, leader: row.leader }))} ariaLabel="Driver championship points gap by season" />
        </div>
        <p className="note">{winRateText(drivers.winRate)}</p>
      </Section>
      <Section title="Constructor battles">
        <BattleTable rows={model.constructors} noun="Leader" />
        <div className="grid-2">
          <article className="card"><h3>Closest gaps</h3><Mini rows={constructors.closest} /></article>
          <article className="card"><h3>Largest gaps</h3><Mini rows={constructors.dominant} /></article>
        </div>
      </Section>
      <Definitions items={[
        { term: "In progress", detail: DEFINITIONS.inProgress },
        { term: "Win rate", detail: DEFINITIONS.winRate },
        { term: "Podiums", detail: "Podium totals are not in the standings feed, so they are not aggregated in this window. Season podiums are on each driver profile." },
      ]} />
    </>
  );
}

function winRateText(rows: SeasonBattle[]) {
  if (!rows.length || !rows[0].rounds) return "Win rate is unavailable because the standings round was missing.";
  const names = rows.map((row) => `${row.season} ${row.leader} (${row.leaderWins}/${row.rounds}, ${formatPercent(row.leaderWins / row.rounds!)})`).join("; ");
  return `Highest win rate in this completed window: ${names}.`;
}

function Mini({ rows }: { rows: SeasonBattle[] }) {
  if (!rows.length) return <p className="note">No completed season in this window has both a leader and a runner-up.</p>;
  return <ul className="rank-list">{rows.map((row) => <li key={row.season}><span className="pos">{row.season}</span><span>{row.leader} over {row.second}</span><span>{formatPoints(row.gap)}</span></li>)}</ul>;
}

function BattleTable({ rows, noun }: { rows: SeasonBattle[]; noun: string }) {
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Season battles</caption>
          <thead><tr><th>Season</th><th>Status</th><th>{noun}</th><th className="num">Points</th><th>Runner-up</th><th className="num">Points</th><th className="num">Gap</th><th className="num">Wins</th><th className="num">Rounds</th></tr></thead>
          <tbody>
            {[...rows].reverse().map((row) => (
              <tr key={`${noun}-${row.season}`}>
                <td>{row.season}</td>
                <td>{row.inProgress ? "In progress" : "Final standings"}</td>
                <td>{row.leader}</td>
                <td className="num">{formatPoints(row.leaderPoints)}</td>
                <td>{row.second ?? "—"}</td>
                <td className="num">{row.secondPoints == null ? "—" : formatPoints(row.secondPoints)}</td>
                <td className="num">{row.gap == null ? "—" : formatPoints(row.gap)}</td>
                <td className="num">{row.leaderWins}</td>
                <td className="num">{row.rounds ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
