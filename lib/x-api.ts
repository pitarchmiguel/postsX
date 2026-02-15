/**
 * X (Twitter) API v2 client.
 * Reads credentials from env vars or database (Settings).
 * Falls back to simulation when not configured.
 */

const X_API_BASE = "https://api.twitter.com/2";

export async function isXApiConfigured(): Promise<boolean> {
  if (process.env.X_ACCESS_TOKEN || process.env.X_CLIENT_ID) return true;
  const { db } = await import("@/lib/db");
  const settings = await db.setting.findMany({
    where: { key: { in: ["X_ACCESS_TOKEN", "X_CLIENT_ID"] } },
  });
  return settings.some((s) => s.valueJson?.trim());
}

async function getXApiConfig(): Promise<{
  accessToken?: string;
  clientId?: string;
}> {
  if (process.env.X_ACCESS_TOKEN || process.env.X_CLIENT_ID) {
    return {
      accessToken: process.env.X_ACCESS_TOKEN,
      clientId: process.env.X_CLIENT_ID,
    };
  }
  const { db } = await import("@/lib/db");
  const settings = await db.setting.findMany({
    where: { key: { in: ["X_ACCESS_TOKEN", "X_CLIENT_ID"] } },
  });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.valueJson]));
  const accessToken = map.X_ACCESS_TOKEN?.trim();
  const clientId = map.X_CLIENT_ID?.trim();
  return {
    accessToken: accessToken || undefined,
    clientId: clientId || undefined,
  };
}

export async function verifyXConnection(): Promise<{
  success: boolean;
  username?: string;
  name?: string;
  profileImageUrl?: string;
  error?: string;
}> {
  const config = await getXApiConfig();
  if (!config.accessToken) {
    return { success: false, error: "No access token configured" };
  }
  try {
    const res = await fetch(
      `${X_API_BASE}/users/me?user.fields=username,name,profile_image_url`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const detail = (err as { detail?: string }).detail || res.statusText;
      const isAppOnly =
        /OAuth 2\.0 Application-Only|Application-Only.*forbidden/i.test(detail);
      return {
        success: false,
        error: isAppOnly
          ? "Use OAuth 2.0 User Context tokens (PKCE flow), not Application-Only. See Settings instructions."
          : detail,
      };
    }
    const data = (await res.json()) as {
      data?: { username: string; name: string; profile_image_url?: string };
    };
    return {
      success: true,
      username: data.data?.username,
      name: data.data?.name,
      profileImageUrl: data.data?.profile_image_url,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function postTweet(
  text: string,
  options?: { forceSimulation?: boolean }
): Promise<{ id: string } | null> {
  if (options?.forceSimulation) {
    return { id: `mock_${Date.now()}` };
  }
  const config = await getXApiConfig();
  if (!config.accessToken && !config.clientId) {
    return { id: `mock_${Date.now()}` };
  }
  if (!config.accessToken) {
    return { id: `mock_${Date.now()}` };
  }

  try {
    const res = await fetch(`${X_API_BASE}/tweets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || res.statusText);
    }

    const data = (await res.json()) as { data?: { id: string } };
    return data.data ? { id: data.data.id } : null;
  } catch (err) {
    console.error("X API postTweet error:", err);
    throw err;
  }
}

export type MetricsSource = "real" | "simulated" | "unavailable";

export interface TweetMetrics {
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  bookmarks: number;
  source: MetricsSource;
  error?: string;
}

export async function getTweetMetrics(tweetId: string): Promise<TweetMetrics> {
  // Mock tweets always return simulated data
  if (tweetId.startsWith("mock_")) {
    return {
      impressions: Math.floor(Math.random() * 500) + 50,
      likes: Math.floor(Math.random() * 20),
      replies: Math.floor(Math.random() * 5),
      reposts: Math.floor(Math.random() * 5),
      bookmarks: Math.floor(Math.random() * 10),
      source: "simulated",
    };
  }

  const config = await getXApiConfig();
  const token = config.accessToken;

  // No credentials configured - return unavailable
  if (!token) {
    return {
      impressions: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      bookmarks: 0,
      source: "unavailable",
      error: "No X API credentials configured",
    };
  }

  // Try to fetch real metrics from X API
  try {
    const res = await fetch(
      `${X_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("X API getTweetMetrics error:", errorText);

      // Handle specific error cases
      if (res.status === 404) {
        return {
          impressions: 0,
          likes: 0,
          replies: 0,
          reposts: 0,
          bookmarks: 0,
          source: "unavailable",
          error: "Tweet not found (may have been deleted)",
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          impressions: 0,
          likes: 0,
          replies: 0,
          reposts: 0,
          bookmarks: 0,
          source: "unavailable",
          error: "Invalid or expired X API credentials",
        };
      }

      throw new Error(errorText);
    }

    const data = (await res.json()) as {
      data?: { public_metrics?: Record<string, number> };
    };
    const metrics = data.data?.public_metrics ?? {};

    return {
      impressions: metrics.impression_count ?? 0,
      likes: metrics.like_count ?? 0,
      replies: metrics.reply_count ?? 0,
      reposts: metrics.retweet_count ?? 0,
      bookmarks: metrics.bookmark_count ?? 0,
      source: "real",
    };
  } catch (err) {
    console.error("X API getTweetMetrics error:", err);
    return {
      impressions: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
      bookmarks: 0,
      source: "unavailable",
      error: String(err),
    };
  }
}
