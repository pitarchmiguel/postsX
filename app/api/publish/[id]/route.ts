import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { postTweet, isXApiConfigured } from "@/lib/x-api";

async function getSimulationMode(): Promise<boolean> {
  const setting = await db.setting.findUnique({
    where: { key: "SIMULATION_MODE" },
  });
  const val = setting?.valueJson ?? "true";
  return val === "true";
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await db.post.findUnique({
      where: { id },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "PUBLISHED") {
      return Response.json(
        { error: "Post is already published" },
        { status: 400 }
      );
    }

    const simulationMode = await getSimulationMode();
    const xApiConfigured = await isXApiConfigured();

    let tweetId: string;
    let simulated = false;

    if (!xApiConfigured || simulationMode) {
      const result = await postTweet(post.text, { forceSimulation: simulationMode });
      tweetId = result?.id ?? `mock_${Date.now()}`;
      simulated = true;
    } else {
      try {
        const result = await postTweet(post.text);
        if (!result) throw new Error("No tweet ID returned");
        tweetId = result.id;
      } catch (err) {
        console.error("X API publish failed:", err);
        await db.post.update({
          where: { id },
          data: { status: "FAILED" },
        });
        return Response.json(
          { error: "Failed to publish to X", details: String(err) },
          { status: 502 }
        );
      }
    }

    await db.post.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        xTweetId: tweetId,
      },
    });

    const { getTweetMetrics } = await import("@/lib/x-api");
    const metrics = await getTweetMetrics(tweetId);
    await db.metric.create({
      data: {
        postId: id,
        ...metrics,
      },
    });

    return Response.json({
      success: true,
      tweetId,
      simulated,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
