import Link from "next/link";
import { PointsChart } from "@/components/charts/Charts";
import { Definitions, MetaBar, PageHeader, Section, Stat } from "@/components/ui/Chrome";
import { PathSelect } from "@/components/ui/Controls";
import { formatPercent, formatPoints } from "@/lib/f1/format";
import type { ConstructorProfileModel } from "@/lib/f1/models";
import { constructorPath } from "@/lib/f1/routes";
import { DEFINITIONS } from "@/lib/f1/source";

export function ConstructorView({ model }: { model: ConstructorProfileModel }) {
  return (
    <>
      <PageHeader
        kicker={`Season ${model.season}`}
        title={model.constructor.name}
        description={model.constructor.nationality ?? undefined}
        crumbs={[{ href: `/?season=${model.season}`, label: "Overview" }, { href: `/constructors?season=${model.season}`, label: "Constructors" }]}
        actions={<PathSelect label="Constructor" value={model.constructor.id} options={model.directory.map((item) => ({ value: item.id, label: item.name, href: constructorPath(model.season, item.id) }))} />}
      />
      <MetaBar meta={model.meta} />
      <div className="grid-stats">
        <Stat label="Championship points" value={model.standing ? formatPoints(model.standing.points) : "—"} detail={model.standing ? `P${model.standing.position}` : "No standings row"} />
        <Stat label="Standings wins" value={model.standing ? String(model.standing.wins) : "—"} detail="From the standings feed" />
        <Stat label="Classified wins" value={String(model.wins)} detail="Distinct rounds with a P1 for this constructor" />
        <Stat label="Podium results" value={String(model.podiums)} detail="Driver results in P1–P3, so a double podium counts twice" />
        <Stat label="Session points" value={formatPoints(model.sessionPoints)} detail="Race plus sprint rows" />
      </div>
      {model.pointsNote ? <p className="note" style={{ marginTop: 12 }}>{model.pointsNote}</p> : null}
      <Section title="Lineup" description="Championship points belong to the driver. Session points and share count only what was scored for this constructor.">
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Constructor lineup</caption>
              <thead><tr><th>Driver</th><th className="num">Championship pts</th><th className="num">For this team</th><th className="num">Share</th><th className="num">Wins</th><th className="num">Podiums</th></tr></thead>
              <tbody>
                {model.lineup.map((row) => (
                  <tr key={row.driver.id}>
                    <td><Link className="table-link" href={row.href}>{row.driver.name}</Link></td>
                    <td className="num">{row.championshipPoints == null ? "—" : formatPoints(row.championshipPoints)}</td>
                    <td className="num">{formatPoints(row.sessionPoints)}</td>
                    <td className="num">{formatPercent(row.share)}</td>
                    <td className="num">{row.wins}</td>
                    <td className="num">{row.podiums}</td>
                  </tr>
                ))}
                {!model.lineup.length ? <tr><td colSpan={6}>No driver results were returned for this constructor.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <div className="grid-2">
        <Section title="Season points" description={DEFINITIONS.sessionPoints}>
          <div className="card chart-card"><PointsChart series={model.progression} ariaLabel="Constructor session points" /></div>
        </Section>
        <Section title="Points per round">
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Points by round</caption>
                <thead><tr><th>Round</th><th>Race</th><th className="num">Points</th></tr></thead>
                <tbody>
                  {model.pointsByRound.map((row) => (
                    <tr key={row.round}><td className="num">{row.round}</td><td>{row.label}</td><td className="num">{formatPoints(row.points)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      </div>
      <Section title="Historical standings" description={model.careerNote}>
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Constructor season history</caption>
              <thead><tr><th>Season</th><th className="num">Position</th><th className="num">Points</th><th className="num">Wins</th></tr></thead>
              <tbody>
                {[...model.career].reverse().map((row) => (
                  <tr key={row.season}><td>{row.season}</td><td className="num">{row.position}</td><td className="num">{formatPoints(row.points)}</td><td className="num">{row.wins}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <Definitions items={[{ term: "Share", detail: DEFINITIONS.teammateShare }, { term: "Points across seasons", detail: DEFINITIONS.pointsGap }]} />
    </>
  );
}
