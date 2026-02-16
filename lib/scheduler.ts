import { db } from "@/lib/db";
import { postTweet, getTweetMetrics, isXApiConfigured } from "@/lib/x-api";

async function getSimulationMode(): Promise<boolean> {
  const setting = await db.setting.findUnique({
    where: { key: "SIMULATION_MODE" },
  });
  const val = setting?.valueJson ?? "true";
  return val === "true";
}

export async function runScheduler(): Promise<{
  processed: number;
  results: { id: string; status: string }[];
}> {
  const now = new Date();
  const results: { id: string; status: string }[] = [];

  const duePosts = await db.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
  });

  console.log(`[Scheduler] Running at ${now.toISOString()}, found ${duePosts.length} posts due`);

  const simulationMode = await getSimulationMode();

  for (const post of duePosts) {
    // Skip posts without userId (should not happen after migration)
    if (!post.userId) {
      console.error(`[Scheduler] Post ${post.id} has no userId, marking as failed`);
      await db.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });
      continue;
    }

    console.log(`[Scheduler] Processing post ${post.id}, scheduled for ${post.scheduledAt?.toISOString()}, userId: ${post.userId}`);

    try {
      // Check X API configuration for this specific user
      const xApiConfigured = await isXApiConfigured(post.userId);
      const useSimulation = simulationMode || !xApiConfigured;

      console.log(`[Scheduler] Post ${post.id}: simulationMode=${simulationMode}, xApiConfigured=${xApiConfigured}, useSimulation=${useSimulation}`);

      const result = await postTweet(post.userId, post.text, {
        forceSimulation: useSimulation,
        communityId: post.communityId,
      });
      const tweetId = result?.id ?? `mock_${Date.now()}_${post.id}`;

      console.log(`[Scheduler] Post ${post.id} published successfully, tweetId: ${tweetId}`);

      await db.post.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          xTweetId: tweetId,
        },
      });

      const metrics = await getTweetMetrics(post.userId, tweetId);

      // Extract only the metric fields (exclude source and error)
      const { impressions, likes, replies, reposts, bookmarks } = metrics;
      await db.metric.create({
        data: {
          postId: post.id,
          impressions,
          likes,
          replies,
          reposts,
          bookmarks,
        },
      });

      results.push({ id: post.id, status: "published" });
    } catch (err) {
      console.error(`[Scheduler] Failed to publish post ${post.id}:`, err);
      await db.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });
      results.push({ id: post.id, status: "failed" });
    }
  }

  console.log(`[Scheduler] Completed: processed ${results.length} posts`);
  if (results.length > 0) {
    console.log(`[Scheduler] Results:`, results);
  }

  return { processed: results.length, results };
}
