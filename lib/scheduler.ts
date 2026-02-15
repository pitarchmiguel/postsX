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

  const simulationMode = await getSimulationMode();
  const xApiConfigured = await isXApiConfigured();
  const useSimulation = simulationMode || !xApiConfigured;

  for (const post of duePosts) {
    try {
      const result = await postTweet(post.text, { forceSimulation: useSimulation });
      const tweetId = result?.id ?? `mock_${Date.now()}_${post.id}`;

      await db.post.update({
        where: { id: post.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          xTweetId: tweetId,
        },
      });

      const metrics = await getTweetMetrics(tweetId);
      await db.metric.create({
        data: {
          postId: post.id,
          ...metrics,
        },
      });

      results.push({ id: post.id, status: "published" });
    } catch (err) {
      console.error(`Failed to publish post ${post.id}:`, err);
      await db.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });
      results.push({ id: post.id, status: "failed" });
    }
  }

  return { processed: results.length, results };
}
