import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { postTweet, isXApiConfigured } from "@/lib/x-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the post
    const post = await db.post.findUnique({
      where: { id },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify ownership
    if (post.userId !== currentUser.id) {
      return Response.json({ error: "Not your post" }, { status: 403 });
    }

    // Check if it's a failed post
    if (post.status !== "FAILED" && post.status !== "DRAFT") {
      return Response.json(
        { error: `Cannot retry post with status: ${post.status}` },
        { status: 400 }
      );
    }

    console.log(`[Retry] Attempting to publish post ${post.id}`);

    // Check X API configuration
    const xApiConfigured = await isXApiConfigured(currentUser.id);
    if (!xApiConfigured) {
      return Response.json(
        { error: "X API not configured. Please connect your X account first." },
        { status: 400 }
      );
    }

    // Get simulation mode
    const simulationSetting = await db.setting.findUnique({
      where: { key: "SIMULATION_MODE" },
    });
    const simulationMode = simulationSetting?.valueJson === "true";

    console.log(`[Retry] simulationMode=${simulationMode}, xApiConfigured=${xApiConfigured}`);

    // Try to publish
    const result = await postTweet(currentUser.id, post.text, {
      forceSimulation: simulationMode,
      communityId: post.communityId,
    });

    const tweetId = result?.id ?? `mock_${Date.now()}_${post.id}`;

    console.log(`[Retry] Post ${post.id} published successfully, tweetId: ${tweetId}`);

    // Update post
    await db.post.update({
      where: { id: post.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        xTweetId: tweetId,
      },
    });

    return Response.json({
      success: true,
      tweetId,
      message: "Post published successfully",
    });
  } catch (error) {
    console.error("[Retry] Error:", error);
    return Response.json(
      {
        error: "Failed to publish",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
