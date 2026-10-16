import type { Metadata } from "next";
import { StandingsView } from "@/components/standings/StandingsView";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getStandings } from "@/lib/f1/service";
import { readSearchParams, requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Standings" };

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await readSearchParams(searchParams);
  const view = params.view === "constructors" ? "constructors" : "drivers";
  try {
    return <StandingsView model={await getStandings(await requestedSeason(searchParams))} initialView={view} />;
  } catch (error) {
    return <ErrorState title="Standings unavailable" body={errorMessage(error)} />;
  }
}
