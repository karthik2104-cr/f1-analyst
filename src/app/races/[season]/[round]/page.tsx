import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RaceAnalysis } from "@/components/race/RaceAnalysis";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getRaceDetail } from "@/lib/f1/service";

export const metadata: Metadata = { title: "Race" };

export default async function RacePage({ params }: { params: Promise<{ season: string; round: string }> }) {
  const { season, round } = await params;
  const number = Number(round);
  if (!/^\d{4}$/.test(season) || !Number.isInteger(number)) notFound();
  let model;
  try {
    model = await getRaceDetail(season, number);
  } catch (error) {
    return <ErrorState title="Race analysis unavailable" body={errorMessage(error)} />;
  }
  if (!model) notFound();
  return <RaceAnalysis model={model} />;
}
