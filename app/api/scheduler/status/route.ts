import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    await requireUser();

    const [lastRun, lastError] = await Promise.all([
      db.setting.findUnique({ where: { key: "SCHEDULER_LAST_RUN" } }),
      db.setting.findUnique({ where: { key: "SCHEDULER_LAST_ERROR" } }),
    ]);

    const run = lastRun ? (JSON.parse(lastRun.valueJson) as {
      timestamp: string;
      processed: number;
      simulationMode: boolean;
    }) : null;

    const err = lastError ? (JSON.parse(lastError.valueJson) as {
      timestamp: string;
      simulationMode: boolean;
      failures: { id: string; status: string; error?: string }[];
    }) : null;

    return Response.json({ run, error: err });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
