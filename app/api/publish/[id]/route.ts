import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { postThread, isXApiConfigured, getTweetMetrics } from "@/lib/x-api";
import { requireUser } from "@/lib/auth";

async function getSimulationMode(): Promise<boolean> {
  const setting = await db.setting.findUnique({
    where: { key: "SIMULATION_MODE" },
  });
  const val = setting?.valueJson ?? "true";
  return val === "true";
}

function parseThreadTexts(post: { text: string; threadJson: string | null }): string[] {
  if (!post.threadJson) return [post.text];
  try {
    const parsed = JSON.parse(post.threadJson) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
    }
  } catch {
    // fall through
  }
  return [post.text];
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Verify ownership
    const post = await db.post.findFirst({
      where: {
        id,
        userId: user.id,
      },
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
    const xApiConfigured = await isXApiConfigured(user.id);

    let tweetId: string;
    let simulated = false;

    const texts = parseThreadTexts(post);

    if (!xApiConfigured || simulationMode) {
      const result = await postThread(user.id, texts, {
        forceSimulation: simulationMode,
        communityId: post.communityId,
      });
      tweetId = result?.id ?? `mock_${Date.now()}`;
      simulated = true;
    } else {
      try {
        const result = await postThread(user.id, texts, {
          communityId: post.communityId,
        });
        if (!result) throw new Error("No tweet ID returned");
        tweetId = result.id;
      } catch (err) {
        console.error("X API publish failed:", err);

        // Community-specific error message
        const errorMsg = String(err);
        const isCommunityError = errorMsg.toLowerCase().includes("community");

        await db.post.update({
          where: { id },
          data: { status: "FAILED" },
        });

        return Response.json(
          {
            error: isCommunityError
              ? "Failed to publish to community. Check your permissions."
              : "Failed to publish to X",
            details: errorMsg,
          },
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

    // Metric creation is best-effort — a failure here must NOT affect the publish response
    try {
      const metrics = await getTweetMetrics(user.id, tweetId);
      const { impressions, likes, replies, reposts, bookmarks } = metrics;
      await db.metric.create({
        data: {
          postId: id,
          impressions,
          likes,
          replies,
          reposts,
          bookmarks,
        },
      });
    } catch (metricErr) {
      console.error("Failed to record metrics for post", id, metricErr);
    }

    return Response.json({
      success: true,
      tweetId,
      simulated,
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
