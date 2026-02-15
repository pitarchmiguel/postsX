import { db } from "@/lib/db";

export async function GET() {
  try {
    const publishedPosts = await db.post.findMany({
      where: { status: "PUBLISHED", xTweetId: { not: null } },
    });

    const results: { postId: string; updated: boolean }[] = [];

    for (const post of publishedPosts) {
      if (!post.xTweetId) continue;

      // Simulation: add/update mock metrics (real X API in Phase 10)
      const existingMetric = await db.metric.findFirst({
        where: { postId: post.id },
        orderBy: { capturedAt: "desc" },
      });

      if (existingMetric) {
        // Update existing with slight random variation
        await db.metric.update({
          where: { id: existingMetric.id },
          data: {
            impressions: existingMetric.impressions + Math.floor(Math.random() * 20),
            likes: existingMetric.likes + Math.floor(Math.random() * 3),
            replies: existingMetric.replies + Math.floor(Math.random() * 1),
            reposts: existingMetric.reposts + Math.floor(Math.random() * 1),
            bookmarks: existingMetric.bookmarks + Math.floor(Math.random() * 2),
          },
        });
      } else {
        await db.metric.create({
          data: {
            postId: post.id,
            impressions: Math.floor(Math.random() * 500) + 50,
            likes: Math.floor(Math.random() * 20),
            replies: Math.floor(Math.random() * 5),
            reposts: Math.floor(Math.random() * 5),
            bookmarks: Math.floor(Math.random() * 10),
          },
        });
      }
      results.push({ postId: post.id, updated: true });
    }

    return Response.json({
      success: true,
      refreshed: results.length,
      results,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
