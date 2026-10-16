import Link from "next/link";
import { BarSet, GroupedBars } from "@/components/charts/Charts";
import { ChampionshipLab } from "@/components/overview/ChampionshipLab";
import { MetaBar, PageHeader, Section, Stat } from "@/components/ui/Chrome";
import { Countdown, LocalTime } from "@/components/ui/Time";
import { formatPoints, formatRaceDate, shortRace } from "@/lib/f1/format";
import type { OverviewModel } from "@/lib/f1/models";
import { constructorPath, driverPath, racePath, withSeason } from "@/lib/f1/routes";
import { DEFINITIONS } from "@/lib/f1/source";

function gapLabel(position: number, gap: number | null): string {
  if (gap == null) return "—";
  if (position === 1) return "Leader";
  if (gap === 0) return "0";
  return `−${formatPoints(gap)}`;
}

export function OverviewView({ model }: { model: OverviewModel }) {
  return (
    <>
      <PageHeader
        kicker={`Season ${model.season}`}
        title="Championship performance"
        description={`${model.statusLine} Figures come from Jolpica and are not a live timing feed.`}
      />
      <MetaBar meta={model.meta} />
      {model.awaiting.length ? (
        <p className="banner">
          {model.awaiting.map((race) => `${race.name} (round ${race.round})`).join(", ")} {model.awaiting.length === 1 ? "has" : "have"} passed the scheduled start without a published classification. No result is inferred.
        </p>
      ) : null}
      <div className="status-strip">
        <article>
          <p className="kicker">Season</p>
          <h2>{model.roundsCompleted}/{model.roundsScheduled || "—"}</h2>
          <p className="note">{model.meta.standingsRound != null ? `Standings through round ${model.meta.standingsRound}` : "Standings round not published"}</p>
        </article>
        <article>
          <p className="kicker">Latest classification</p>
          {model.lastRace ? (
            <>
              <h2><Link href={racePath(model.season, model.lastRace.race.round)}>{shortRace(model.lastRace.race.name)}</Link></h2>
              <p className="note">{formatRaceDate(model.lastRace.race.date)} · {model.lastRace.winner ? model.lastRace.winner.driver.name : "No classified P1"}</p>
            </>
          ) : <p className="note">No classified grand prix yet.</p>}
        </article>
        <article>
          <p className="kicker">Next grand prix</p>
          {model.nextRace ? (
            <>
              <h2><Link href={racePath(model.season, model.nextRace.race.round)}>R{model.nextRace.race.round} {shortRace(model.nextRace.race.name)}</Link></h2>
              <p className="note">{model.nextRace.race.circuit.name}</p>
              <LocalTime date={model.nextRace.race.date} time={model.nextRace.race.time} />
              <Countdown iso={model.nextRace.startIso} />
            </>
          ) : <p className="note">No upcoming grand prix is on the published calendar.</p>}
        </article>
        <article>
          <p className="kicker">Data</p>
          <h2>{model.meta.stale ? "Stale" : "Cached"}</h2>
          <p className="note">{model.meta.fetchedAt ? "Last successful update is in the source line above." : "No retrieval time was recorded."} {model.meta.stale ? "The refresh failed, so this may be out of date." : "The saved response is still inside its refresh window."}</p>
        </article>
      </div>
      <div className="grid-stats">
        {model.stats.map((stat) => <Stat key={stat.label} {...stat} />)}
      </div>
      <Section title="Championship progression" description="Choose drivers or constructors. The chart uses session points, which include sprint rounds when those results exist.">
        <div className="card chart-card">
          <ChampionshipLab
            driverSeries={model.progression}
            constructorSeries={model.constructorProgression}
            driverNote={model.progressionNote}
            constructorNote={model.constructorProgressionNote}
          />
        </div>
      </Section>
      <div className="grid-2">
        <Section title="Driver standings" description="Official championship points. Gap is points behind the leader." action={<Link href={withSeason("/standings", model.season)}>Full standings</Link>}>
          <div className="card">
            <ol className="rank-list">
              {model.driverTop.map((row) => (
                <li key={row.id}>
                  <span className="pos">{row.position}</span>
                  <span>
                    <Link href={driverPath(model.season, row.id)}>{row.name}</Link>
                    <span className="note"> · {row.team ?? "Team unavailable"} · {row.wins} wins</span>
                  </span>
                  <span className="mono">{formatPoints(row.points)} <span className="note">{gapLabel(row.position, row.gap)}</span></span>
                </li>
              ))}
            </ol>
            {!model.driverTop.length ? <p className="note">Driver standings have not been published.</p> : null}
          </div>
        </Section>
        <Section title="Constructor points" description="Official constructor championship points." action={<Link href={withSeason("/standings", model.season, { view: "constructors" })}>Constructor table</Link>}>
          <div className="card chart-card">
            <BarSet rows={model.constructorBars} label="Points" ariaLabel="Constructor championship points" orientation="horizontal" color="#5B9DFF" />
            <ol className="rank-list">
              {model.constructorTop.slice(0, 3).map((row) => (
                <li key={row.id}>
                  <span className="pos">{row.position}</span>
                  <Link href={constructorPath(model.season, row.id)}>{row.name}</Link>
                  <span className="mono">{formatPoints(row.points)} <span className="note">{gapLabel(row.position, row.gap)}</span></span>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </div>
      <div className="grid-2">
        <Section title="Qualifying versus race" description={model.paceNote}>
          <div className="card chart-card">
            <GroupedBars
              rows={model.pace.map((row) => ({ label: row.name, quali: row.avgQuali, finish: row.avgFinish }))}
              series={[{ key: "quali", name: "Avg qualifying", color: "#5B9DFF" }, { key: "finish", name: "Avg finish", color: "#E10600" }]}
              ariaLabel="Average qualifying position and average classified finish"
            />
          </div>
        </Section>
        <Section title="Position changes" description={model.moversNote} action={model.lastRace ? <Link href={racePath(model.season, model.lastRace.race.round)}>Latest race</Link> : undefined}>
          <div className="card">
            {model.movers.length ? (
              <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Largest classified position changes from the grid</caption>
                <thead><tr><th>Driver</th><th>Race</th><th className="num">Grid</th><th className="num">Finish</th><th className="num">Change</th></tr></thead>
                <tbody>
                  {model.movers.map((move) => (
                    <tr key={`${move.id}-${move.round}-${move.delta}`}>
                      <td><Link className="table-link" href={driverPath(model.season, move.id)}>{move.name}</Link></td>
                      <td><Link className="table-link" href={racePath(model.season, move.round)}>R{move.round} {shortRace(move.race)}</Link></td>
                      <td className="num">{move.grid}</td>
                      <td className="num">{move.finish}</td>
                      <td className="num">{move.delta > 0 ? `+${move.delta} gained` : `${move.delta} lost`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : <p className="note">{model.moversNote}</p>}
          </div>
        </Section>
      </div>
      <Section title="Recent results" description="Winner of each classified grand prix. Open a round for the full classification.">
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Recent race winners</caption>
              <thead><tr><th>Round</th><th>Grand Prix</th><th>Date</th><th>Winner</th><th>Team</th><th>Time</th></tr></thead>
              <tbody>
                {model.recent.map((race) => (
                  <tr key={race.round}>
                    <td className="num">{race.round}</td>
                    <td><Link className="table-link" href={racePath(model.season, race.round)}>{race.name}</Link></td>
                    <td>{formatRaceDate(race.date)}</td>
                    <td>{race.winnerId ? <Link className="table-link" href={driverPath(model.season, race.winnerId)}>{race.winner}</Link> : "—"}</td>
                    <td>{race.team ?? "—"}</td>
                    <td className="mono">{race.time ?? "—"}</td>
                  </tr>
                ))}
                {!model.recent.length ? <tr><td colSpan={6}>No classified races yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <Section title="Continue">
        <div className="link-row">
          {model.links.map((link) => (
            <Link key={link.href} href={link.href} className="card">
              <h3>{link.title}</h3>
              <p className="note">{link.detail}</p>
            </Link>
          ))}
        </div>
      </Section>
      <p className="note" style={{ marginTop: 18 }}>{DEFINITIONS.sessionPoints} {DEFINITIONS.notLive}</p>
    </>
  );
}
