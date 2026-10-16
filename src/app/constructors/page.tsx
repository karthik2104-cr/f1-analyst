import type { Metadata } from "next";
import { ConstructorIndex } from "@/components/constructors/ConstructorIndex";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getConstructorIndex } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Constructors" };

export default async function ConstructorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    return <ConstructorIndex model={await getConstructorIndex(await requestedSeason(searchParams))} />;
  } catch (error) {
    return <ErrorState title="Constructor index unavailable" body={errorMessage(error)} />;
  }
}
