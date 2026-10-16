import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ErrorState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/Chrome";
import { errorMessage } from "@/lib/f1/errors";
import { cacheStatus } from "@/lib/f1/service";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  try {
    const cache = await cacheStatus();
    return (
      <>
        <PageHeader
          kicker="Data"
          title="Settings and sources"
          description="Display preferences stay in this browser. Championship data is retrieved from Jolpica-F1 and saved on the server that runs this app."
        />
        <SettingsPanel cache={cache} />
      </>
    );
  } catch (error) {
    return <ErrorState title="Settings unavailable" body={errorMessage(error)} />;
  }
}
