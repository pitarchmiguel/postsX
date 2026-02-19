import { db } from "@/lib/db";
import { postThread, getTweetMetrics, isXApiConfigured } from "@/lib/x-api";

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
    console.warn(`[Scheduler] Invalid threadJson for post, falling back to text`);
  }
  return [post.text];
}

export async function runScheduler(): Promise<{
  processed: number;
  results: { id: string; status: string; error?: string }[];
}> {
  const now = new Date();
  const results: { id: string; status: string; error?: string }[] = [];

  const duePosts = await db.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
  });

  console.log(`[Scheduler] Running at ${now.toISOString()}, found ${duePosts.length} posts due`);

  const simulationMode = await getSimulationMode();
  console.log(`[Scheduler] simulationMode=${simulationMode}`);

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

      const texts = parseThreadTexts(post);

      const result = await postThread(post.userId, texts, {
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

      // Metric creation is best-effort — a failure here must NOT un-publish the post
      try {
        const metrics = await getTweetMetrics(post.userId, tweetId);
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
      } catch (metricErr) {
        console.error(`[Scheduler] Failed to record metrics for post ${post.id}:`, metricErr);
      }

      results.push({ id: post.id, status: "published" });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Scheduler] Failed to publish post ${post.id}: ${errorMsg}`, err);
      await db.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });
      results.push({ id: post.id, status: "failed", error: errorMsg });
    }
  }

  console.log(`[Scheduler] Completed: processed ${results.length} posts`);
  if (results.length > 0) {
    console.log(`[Scheduler] Results:`, results);
  }

  // Persist diagnostics (visible without Vercel logs)
  try {
    // Always update "last run" so the UI can confirm the scheduler is active
    await db.setting.upsert({
      where: { key: "SCHEDULER_LAST_RUN" },
      create: {
        key: "SCHEDULER_LAST_RUN",
        valueJson: JSON.stringify({ timestamp: now.toISOString(), processed: results.length, simulationMode }),
      },
      update: {
        valueJson: JSON.stringify({ timestamp: now.toISOString(), processed: results.length, simulationMode }),
      },
    });

    // Persist the last FAILURE separately so it survives subsequent 0-post runs
    const failures = results.filter((r) => r.status === "failed");
    if (failures.length > 0) {
      await db.setting.upsert({
        where: { key: "SCHEDULER_LAST_ERROR" },
        create: {
          key: "SCHEDULER_LAST_ERROR",
          valueJson: JSON.stringify({ timestamp: now.toISOString(), failures, simulationMode }),
        },
        update: {
          valueJson: JSON.stringify({ timestamp: now.toISOString(), failures, simulationMode }),
        },
      });
    }
  } catch {
    // best-effort — don't crash the scheduler if diagnostic storage fails
  }

  return { processed: results.length, results };
}
