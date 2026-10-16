import { errorMessage } from "@/lib/f1/errors";
import { getBrief } from "@/lib/f1/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const season = new URL(request.url).searchParams.get("season") || "current";
  try {
    return Response.json(await getBrief(season));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 503 });
  }
}
