import type { Metadata } from "next";
import { OverviewView } from "@/components/overview/OverviewView";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getOverview } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    return <OverviewView model={await getOverview(await requestedSeason(searchParams))} />;
  } catch (error) {
    return <ErrorState title="Overview unavailable" body={errorMessage(error)} />;
  }
}
