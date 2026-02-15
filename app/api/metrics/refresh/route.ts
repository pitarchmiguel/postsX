import { refreshMetrics } from "@/lib/metrics-refresher";

export async function GET() {
  try {
    const result = await refreshMetrics();

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
