import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { postTweet, isXApiConfigured } from "@/lib/x-api";
import { requireUser } from "@/lib/auth";

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

    if (!xApiConfigured || simulationMode) {
      const result = await postTweet(user.id, post.text, {
        forceSimulation: simulationMode,
        communityId: post.communityId,
      });
      tweetId = result?.id ?? `mock_${Date.now()}`;
      simulated = true;
    } else {
      try {
        const result = await postTweet(user.id, post.text, {
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

    const { getTweetMetrics } = await import("@/lib/x-api");
    const metrics = await getTweetMetrics(user.id, tweetId);

    // Extract only the metric fields (exclude source and error)
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
