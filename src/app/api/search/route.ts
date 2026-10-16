import { errorMessage } from "@/lib/f1/errors";
import { searchSeason } from "@/lib/f1/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const season = url.searchParams.get("season") || "current";
  const query = url.searchParams.get("q") ?? "";
  if (query.trim().length < 2) return Response.json({ season: null, drivers: [], constructors: [], races: [] });
  try {
    return Response.json(await searchSeason(season, query));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}
