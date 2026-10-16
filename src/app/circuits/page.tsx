import type { Metadata } from "next";
import { CircuitIndex } from "@/components/circuits/CircuitIndex";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getCircuits } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Circuits" };

export default async function CircuitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const season = await requestedSeason(searchParams);
  try {
    return <CircuitIndex model={await getCircuits()} season={season} />;
  } catch (error) {
    return <ErrorState title="Circuit list unavailable" body={errorMessage(error)} />;
  }
}
