import { db } from "@/lib/db";

export interface EngagementStats {
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number;
  avgEngagementRate: number;
  topHour: number | null;
  topDay: string | null;
}

export interface DayOfWeekData {
  day: number; // 0-6 (Sunday-Saturday)
  dayName: string;
  avgEngagement: number;
  postCount: number;
  bestHours: number[]; // Top 3 hours for this day
}

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

export async function getEngagementStats(): Promise<EngagementStats> {
  const metrics = await db.metric.findMany({
    include: { post: true },
    where: { post: { status: "PUBLISHED" } },
  });

  // Get latest metric per post
  const latestMetricsByPost = new Map<string, typeof metrics[0]>();
  for (const m of metrics) {
    const existing = latestMetricsByPost.get(m.postId);
    if (!existing || m.capturedAt > existing.capturedAt) {
      latestMetricsByPost.set(m.postId, m);
    }
  }

  const metricsArray = Array.from(latestMetricsByPost.values());
  const totalPosts = metricsArray.length;

  if (totalPosts === 0) {
    return {
      totalPosts: 0,
      totalEngagement: 0,
      avgEngagement: 0,
      avgEngagementRate: 0,
      topHour: null,
      topDay: null,
    };
  }

  let totalEngagement = 0;
  let totalImpressions = 0;
  const hourEngagement: Record<number, number> = {};
  const dayEngagement: Record<number, number> = {};

  for (const m of metricsArray) {
    const engagement =
      m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks;
    totalEngagement += engagement;
    totalImpressions += m.impressions;

    if (m.post.publishedAt) {
      const date = new Date(m.post.publishedAt);
      const hour = date.getUTCHours();
      const day = date.getUTCDay();
      hourEngagement[hour] = (hourEngagement[hour] || 0) + engagement;
      dayEngagement[day] = (dayEngagement[day] || 0) + engagement;
    }
  }

  const avgEngagement = Math.round(totalEngagement / totalPosts);
  const avgEngagementRate =
    totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

  // Find top hour
  let topHour: number | null = null;
  let maxHourEngagement = 0;
  for (const [hour, eng] of Object.entries(hourEngagement)) {
    if (eng > maxHourEngagement) {
      maxHourEngagement = eng;
      topHour = parseInt(hour, 10);
    }
  }

  // Find top day
  let topDayIndex: number | null = null;
  let maxDayEngagement = 0;
  for (const [day, eng] of Object.entries(dayEngagement)) {
    if (eng > maxDayEngagement) {
      maxDayEngagement = eng;
      topDayIndex = parseInt(day, 10);
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const topDay = topDayIndex !== null ? dayNames[topDayIndex] : null;

  return {
    totalPosts,
    totalEngagement,
    avgEngagement,
    avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    topHour,
    topDay,
  };
}

export interface TimeSlotData {
  hour: number;
  avgEngagement: number;
  postCount: number;
  confidence: "high" | "medium" | "low";
}

export async function getBestTimeSlotsChart(): Promise<TimeSlotData[]> {
  const metrics = await db.metric.findMany({
    include: { post: true },
    where: { post: { status: "PUBLISHED" } },
  });

  // Get latest metric per post to avoid duplicates
  const latestMetricsByPost = new Map<string, typeof metrics[0]>();
  for (const m of metrics) {
    const existing = latestMetricsByPost.get(m.postId);
    if (!existing || m.capturedAt > existing.capturedAt) {
      latestMetricsByPost.set(m.postId, m);
    }
  }

  const hourData: Record<number, { total: number; count: number }> = {};
  for (let h = 0; h < 24; h++) hourData[h] = { total: 0, count: 0 };

  for (const m of latestMetricsByPost.values()) {
    const publishedAt = m.post.publishedAt;
    if (publishedAt) {
      const hour = new Date(publishedAt).getUTCHours(); // Use UTC hours
      const engagement =
        m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks;
      hourData[hour].total += engagement;
      hourData[hour].count += 1;
    }
  }

  return Object.entries(hourData).map(([hour, data]) => {
    const postCount = data.count;
    let confidence: "high" | "medium" | "low";

    if (postCount >= 10) {
      confidence = "high";
    } else if (postCount >= 3) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return {
      hour: parseInt(hour, 10),
      avgEngagement: postCount > 0 ? Math.round(data.total / postCount) : 0,
      postCount,
      confidence,
    };
  });
}

export async function getBestDayOfWeek(): Promise<DayOfWeekData[]> {
  const metrics = await db.metric.findMany({
    include: { post: true },
    where: { post: { status: "PUBLISHED" } },
  });

  // Get latest metric per post
  const latestMetricsByPost = new Map<string, typeof metrics[0]>();
  for (const m of metrics) {
    const existing = latestMetricsByPost.get(m.postId);
    if (!existing || m.capturedAt > existing.capturedAt) {
      latestMetricsByPost.set(m.postId, m);
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Initialize data for all days
  const dayData: Record<
    number,
    { total: number; count: number; hourEngagement: Record<number, number> }
  > = {};
  for (let d = 0; d < 7; d++) {
    dayData[d] = { total: 0, count: 0, hourEngagement: {} };
  }

  // Aggregate metrics by day and hour
  for (const m of latestMetricsByPost.values()) {
    if (m.post.publishedAt) {
      const date = new Date(m.post.publishedAt);
      const day = date.getUTCDay();
      const hour = date.getUTCHours();
      const engagement =
        m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks;

      dayData[day].total += engagement;
      dayData[day].count += 1;
      dayData[day].hourEngagement[hour] = (dayData[day].hourEngagement[hour] || 0) + engagement;
    }
  }

  return Object.entries(dayData).map(([day, data]) => {
    const dayNum = parseInt(day, 10);
    const postCount = data.count;
    const avgEngagement = postCount > 0 ? Math.round(data.total / postCount) : 0;

    // Find top 3 hours for this day
    const hourEntries = Object.entries(data.hourEngagement)
      .map(([h, eng]) => ({ hour: parseInt(h, 10), engagement: eng }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);

    const bestHours = hourEntries.map((e) => e.hour);

    return {
      day: dayNum,
      dayName: dayNames[dayNum],
      avgEngagement,
      postCount,
      bestHours,
    };
  });
}
