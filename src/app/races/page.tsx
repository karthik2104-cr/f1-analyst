import type { Metadata } from "next";
import Link from "next/link";
import { MetaBar, PageHeader } from "@/components/ui/Chrome";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getRaceIndex } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Race analysis" };

function phaseClass(phase: string) {
  if (phase === "completed") return "chip phase-completed";
  if (phase === "upcoming") return "chip phase-upcoming";
  return "chip phase-awaiting";
}

export default async function RacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    const model = await getRaceIndex(await requestedSeason(searchParams));
    return (
      <>
        <PageHeader
          kicker={`Season ${model.season}`}
          title="Race analysis"
          description="Open a round for the classification, qualifying, lap times, and pit stops Jolpica published. Tyre compounds, sectors, and telemetry are not in this feed."
        />
        <MetaBar meta={model.meta} />
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <caption className="sr-only">Season rounds</caption>
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Grand Prix</th>
                  <th>Circuit</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {model.races.map((race) => (
                  <tr key={race.round}>
                    <td>{race.round}</td>
                    <td>
                      <Link className="table-link" href={`/races/${model.season}/${race.round}`}>
                        {race.name}
                      </Link>
                    </td>
                    <td>{race.circuit}{race.country ? `, ${race.country}` : ""}</td>
                    <td>{race.date}</td>
                    <td><span className={phaseClass(race.phase)}>{race.phase === "awaiting-results" ? "Awaiting results" : race.phase}</span></td>
                    <td>{race.winner ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {model.latestRound ? <p className="note">Latest published classification is round {model.latestRound}.</p> : null}
      </>
    );
  } catch (error) {
    return <ErrorState title="Race list unavailable" body={errorMessage(error)} />;
  }
}
