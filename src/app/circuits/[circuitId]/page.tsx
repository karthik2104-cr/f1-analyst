import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircuitDetail } from "@/components/history/HistoryViews";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getCircuit } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Circuit" };

export default async function CircuitPage({
  params,
  searchParams,
}: {
  params: Promise<{ circuitId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { circuitId } = await params;
  let model;
  try {
    model = await getCircuit(circuitId, await requestedSeason(searchParams));
  } catch (error) {
    return <ErrorState title="Circuit unavailable" body={errorMessage(error)} />;
  }
  if (!model) notFound();
  return <CircuitDetail model={model} />;
}
