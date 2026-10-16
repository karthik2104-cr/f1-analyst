import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DriverView } from "@/components/drivers/DriverView";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getDriverProfile } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Driver" };

export default async function DriverPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { driverId } = await params;
  let model;
  try {
    model = await getDriverProfile(await requestedSeason(searchParams), driverId);
  } catch (error) {
    return <ErrorState title="Driver profile unavailable" body={errorMessage(error)} />;
  }
  if (!model) notFound();
  return <DriverView model={model} />;
}
