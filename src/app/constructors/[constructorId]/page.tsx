import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConstructorView } from "@/components/constructors/ConstructorView";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getConstructorProfile } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Constructor" };

export default async function ConstructorPage({
  params,
  searchParams,
}: {
  params: Promise<{ constructorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { constructorId } = await params;
  let model;
  try {
    model = await getConstructorProfile(await requestedSeason(searchParams), constructorId);
  } catch (error) {
    return <ErrorState title="Constructor profile unavailable" body={errorMessage(error)} />;
  }
  if (!model) notFound();
  return <ConstructorView model={model} />;
}
