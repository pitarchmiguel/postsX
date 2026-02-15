import { NextRequest } from "next/server";
import { refreshMetrics } from "@/lib/metrics-refresher";

/**
 * Cron endpoint for automatic metrics refresh
 * Protected by CRON_SECRET environment variable
 * Should be called every 15 minutes by cron service
 */

async function handleRefresh(request: NextRequest) {
  // Verify CRON_SECRET for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error("Unauthorized metrics cron attempt");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting automatic metrics refresh...");
    const result = await refreshMetrics();

    console.log(
      `Metrics refresh complete: ${result.refreshed} refreshed, ${result.failed} failed, ${result.skipped} skipped`
    );

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Metrics cron error:", error);
    return Response.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
