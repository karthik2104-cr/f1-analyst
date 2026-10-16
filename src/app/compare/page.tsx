import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompareTool } from "@/components/compare/CompareTool";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getComparison } from "@/lib/f1/service";
import { readSearchParams, requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await readSearchParams(searchParams);
  const ids = (params.drivers ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  const round = params.round && /^\d+$/.test(params.round) ? Number(params.round) : null;
  let model;
  try {
    model = await getComparison(await requestedSeason(searchParams), ids, round);
  } catch (error) {
    return <ErrorState title="Comparison unavailable" body={errorMessage(error)} />;
  }
  if (!params.drivers && model.directory.length >= 2) {
    const pair = model.directory.slice(0, 2).map((driver) => driver.id).join(",");
    redirect(`/compare?season=${model.season}&drivers=${pair}`);
  }
  return <CompareTool model={model} />;
}
