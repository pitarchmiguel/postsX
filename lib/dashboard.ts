import { db } from "@/lib/db";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function getDashboardStats(userId: string) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [scheduledThisWeek, publishedThisWeek, drafts, todayQueue, next7Days] =
    await Promise.all([
      db.post.count({
        where: {
          userId: userId,
          status: "SCHEDULED",
          scheduledAt: { gte: weekStart, lte: weekEnd },
        },
      }),
      db.post.count({
        where: {
          userId: userId,
          status: "PUBLISHED",
          publishedAt: { gte: weekStart, lte: weekEnd },
        },
      }),
      db.post.count({
        where: {
          userId: userId,
          status: "DRAFT",
        },
      }),
      db.post.findMany({
        where: {
          userId: userId,
          status: "SCHEDULED",
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      db.post.findMany({
        where: {
          userId: userId,
          status: "SCHEDULED",
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: "asc" },
        take: 20,
      }),
    ]);

  // Best time slots from metrics
  const metrics = await db.metric.findMany({
    include: { post: true },
    where: {
      post: {
        status: "PUBLISHED",
        userId: userId,
      },
    },
  });

  const hourEngagement: Record<number, { total: number; count: number }> = {};
  for (const m of metrics) {
    const publishedAt = m.post.publishedAt;
    if (publishedAt) {
      const hour = new Date(publishedAt).getHours();
      if (!hourEngagement[hour]) hourEngagement[hour] = { total: 0, count: 0 };
      hourEngagement[hour].total +=
        m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks;
      hourEngagement[hour].count += 1;
    }
  }

  const bestSlots = Object.entries(hourEngagement)
    .map(([hour, data]) => ({
      hour: parseInt(hour, 10),
      avgEngagement: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 3)
    .map((s) => `${s.hour}:00`);

  // Consistency plan: compare weekend vs weekday engagement
  const weekdayMetrics = metrics.filter((m: typeof metrics[0]) => {
    const d = m.post.publishedAt ? new Date(m.post.publishedAt).getDay() : -1;
    return d >= 1 && d <= 5;
  });
  const weekendMetrics = metrics.filter((m: typeof metrics[0]) => {
    const d = m.post.publishedAt ? new Date(m.post.publishedAt).getDay() : -1;
    return d === 0 || d === 6;
  });

  const weekdayAvg =
    weekdayMetrics.length > 0
      ? weekdayMetrics.reduce(
          (s: number, m: typeof weekdayMetrics[0]) =>
            s + m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks,
          0
        ) / weekdayMetrics.length
      : 0;
  const weekendAvg =
    weekendMetrics.length > 0
      ? weekendMetrics.reduce(
          (s: number, m: typeof weekendMetrics[0]) =>
            s + m.impressions + m.likes * 2 + m.replies * 3 + m.reposts * 2 + m.bookmarks,
          0
        ) / weekendMetrics.length
      : 0;

  const consistencyPlan =
    weekendAvg < weekdayAvg * 0.7
      ? "2-3 posts/day, 5 days/week (avoid weekends)"
      : "2-3 posts/day, 6 days/week";

  return {
    scheduledThisWeek,
    publishedThisWeek,
    drafts,
    bestTimeSlots: bestSlots.length > 0 ? bestSlots.join(", ") : null,
    consistencyPlan,
    todayQueue,
    next7Days,
  };
}
