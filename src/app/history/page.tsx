import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryViews";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getHistory } from "@/lib/f1/service";
import { readSearchParams, yearOr } from "@/lib/pageData";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await readSearchParams(searchParams);
  const from = params.from ? yearOr(params.from, 2014) : null;
  const to = params.to ? yearOr(params.to, new Date().getUTCFullYear()) : null;
  try {
    return <HistoryView model={await getHistory(from, to)} />;
  } catch (error) {
    return <ErrorState title="History unavailable" body={errorMessage(error)} />;
  }
}
