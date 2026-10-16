import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/CalendarView";
import { ErrorState } from "@/components/ui/States";
import { errorMessage } from "@/lib/f1/errors";
import { getCalendar } from "@/lib/f1/service";
import { requestedSeason } from "@/lib/pageData";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    return <CalendarView model={await getCalendar(await requestedSeason(searchParams))} />;
  } catch (error) {
    return <ErrorState title="Calendar unavailable" body={errorMessage(error)} />;
  }
}
