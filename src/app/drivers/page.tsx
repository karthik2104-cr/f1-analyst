import type { Metadata } from "next";
import { DriverIndex } from "@/components/drivers/DriverIndex";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getDriverIndex } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Drivers" };

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    return <DriverIndex model={await getDriverIndex(await requestedSeason(searchParams))} />;
  } catch (error) {
    return <ErrorState title="Driver index unavailable" body={errorMessage(error)} />;
  }
}
