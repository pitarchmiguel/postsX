import { refreshMetrics } from "@/lib/metrics-refresher";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    // Require authentication
    await requireUser();

    const result = await refreshMetrics();

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Support POST as well for better semantics (this is a mutating action)
  return GET();
}
