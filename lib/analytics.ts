import { db } from "@/lib/db";

export async function getTopPosts(limit = 10) {
  const metrics = await db.metric.findMany({
    include: { post: true },
    where: { post: { status: "PUBLISHED" } },
    orderBy: { capturedAt: "desc" },
  });

  const byPost = new Map<
    string,
    { post: { id: string; text: string }; impressions: number; likes: number; engagement: number }
  >();

  for (const m of metrics) {
    if (byPost.has(m.postId)) continue;
    const engagement =
      m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks;
    byPost.set(m.postId, {
      post: { id: m.post.id, text: m.post.text },
      impressions: m.impressions,
      likes: m.likes,
      engagement,
    });
  }

  return Array.from(byPost.values())
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limit);
}

export async function getBestTimeSlotsChart() {
  const metrics = await db.metric.findMany({
    include: { post: true },
    where: { post: { status: "PUBLISHED" } },
  });

  const hourData: Record<number, { total: number; count: number }> = {};
  for (let h = 0; h < 24; h++) hourData[h] = { total: 0, count: 0 };

  for (const m of metrics) {
    const publishedAt = m.post.publishedAt;
    if (publishedAt) {
      const hour = new Date(publishedAt).getHours();
      const engagement =
        m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks;
      hourData[hour].total += engagement;
      hourData[hour].count += 1;
    }
  }

  return Object.entries(hourData).map(([hour, data]) => ({
    hour: parseInt(hour, 10),
    avgEngagement: data.count > 0 ? Math.round(data.total / data.count) : 0,
  }));
}
