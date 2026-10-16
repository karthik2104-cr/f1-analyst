import { errorMessage } from "@/lib/f1/errors";
import { clearDataCache } from "@/lib/f1/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE() {
  try {
    await clearDataCache();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
