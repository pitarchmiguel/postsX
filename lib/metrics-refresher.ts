/**
 * Metrics refresher - Updates post metrics from X API
 * Respects rate limits and creates new metric snapshots (preserves history)
 */

import { db } from "@/lib/db";
import { getTweetMetrics } from "@/lib/x-api";
import {
  canMakeRequest,
  recordRequest,
  getRequestsRemaining,
  getRateLimitStatus,
} from "@/lib/rate-limiter";

export interface RefreshResult {
  refreshed: number;
  failed: number;
  skipped: number;
  rateLimited: boolean;
  rateLimitStatus: ReturnType<typeof getRateLimitStatus>;
  results: Array<{
    postId: string;
    status: "success" | "failed" | "skipped";
    error?: string;
    source?: string;
  }>;
}

/**
 * Refresh metrics for recently published posts
 * Creates new metric snapshots (doesn't update existing - preserves history)
 */
export async function refreshMetrics(): Promise<RefreshResult> {
  const results: RefreshResult["results"] = [];
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;
  let rateLimited = false;

  // Get recently published posts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const posts = await db.post.findMany({
    where: {
      status: "PUBLISHED",
      xTweetId: { not: null },
      publishedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { publishedAt: "desc" }, // Prioritize recent posts
  });

  // Filter out mock tweets
  const realPosts = posts.filter((p: typeof posts[0]) => p.xTweetId && !p.xTweetId.startsWith("mock_"));

  console.log(`Found ${realPosts.length} real posts to refresh (out of ${posts.length} total)`);

  // Check rate limit budget
  const availableRequests = getRequestsRemaining();
  console.log(`Rate limit: ${availableRequests} requests available`);

  for (const post of realPosts) {
    if (!post.xTweetId) continue;

    // Check if we can make another request
    if (!canMakeRequest()) {
      console.log(`Rate limit reached. Stopping after ${refreshed} posts.`);
      rateLimited = true;
      // Mark remaining posts as skipped
      skipped++;
      results.push({
        postId: post.id,
        status: "skipped",
        error: "Rate limit reached",
      });
      continue;
    }

    try {
      // Fetch real metrics from X API
      const metrics = await getTweetMetrics(post.userId, post.xTweetId);
      recordRequest(); // Track this API call

      // Extract metric values
      const { impressions, likes, replies, reposts, bookmarks, source, error } = metrics;

      // Create new metric snapshot (preserve history)
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

      refreshed++;
      results.push({
        postId: post.id,
        status: "success",
        source,
      });

      console.log(
        `✓ Refreshed metrics for post ${post.id} (${post.xTweetId}) - source: ${source}`
      );

      // Log warnings for unavailable metrics
      if (source === "unavailable" && error) {
        console.warn(`Warning: ${error}`);
      }
    } catch (err) {
      failed++;
      const errorMessage = String(err);
      results.push({
        postId: post.id,
        status: "failed",
        error: errorMessage,
      });
      console.error(`✗ Failed to refresh post ${post.id}:`, errorMessage);
      // Continue with next post - don't stop entire batch
    }
  }

  const finalStatus = getRateLimitStatus();

  console.log(`
Refresh complete:
- Refreshed: ${refreshed}
- Failed: ${failed}
- Skipped: ${skipped}
- Rate limited: ${rateLimited}
- Requests remaining: ${finalStatus.requestsRemaining}/${finalStatus.maxRequests}
  `);

  return {
    refreshed,
    failed,
    skipped,
    rateLimited,
    rateLimitStatus: finalStatus,
    results,
  };
}
