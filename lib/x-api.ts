/**
 * X (Twitter) API v2 client.
 * Reads credentials from User table (per-user tokens).
 * Falls back to simulation when not configured.
 */

const X_API_BASE = "https://api.twitter.com/2";

export async function isXApiConfigured(userId: string): Promise<boolean> {
  // Check if this specific user has X configured
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { xAccessToken: true, xClientId: true },
  });
  return !!user?.xAccessToken || !!user?.xClientId;
}

async function getXApiConfig(userId: string): Promise<{
  accessToken?: string;
  clientId?: string;
}> {
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { xAccessToken: true, xClientId: true },
  });

  return {
    accessToken: user?.xAccessToken || undefined,
    clientId: user?.xClientId || undefined,
  };
}

export async function verifyXConnection(userId: string): Promise<{
  success: boolean;
  username?: string;
  name?: string;
  profileImageUrl?: string;
  error?: string;
}> {
  const config = await getXApiConfig(userId);
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

export async function hasCommunityAccess(userId: string): Promise<boolean> {
  const config = await getXApiConfig(userId);
  if (!config.accessToken) return false;

  try {
    // Try to search communities - if it works, we have access
    const res = await fetch(`${X_API_BASE}/communities/search?query=test`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    return res.ok; // 200 = has access, 403 = needs re-auth
  } catch {
    return false;
  }
}

export async function postTweet(
  userId: string,
  text: string,
  options?: {
    forceSimulation?: boolean;
    communityId?: string | null;
  }
): Promise<{ id: string } | null> {
  if (options?.forceSimulation) {
    return { id: `mock_${Date.now()}` };
  }
  const config = await getXApiConfig(userId);
  if (!config.accessToken && !config.clientId) {
    return { id: `mock_${Date.now()}` };
  }
  if (!config.accessToken) {
    return { id: `mock_${Date.now()}` };
  }

  try {
    // Construct body with optional community_id
    const body: { text: string; community_id?: string } = { text };
    if (options?.communityId) {
      body.community_id = options.communityId;
    }

    const res = await fetch(`${X_API_BASE}/tweets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorDetail = (err as { detail?: string }).detail || res.statusText;

      // Error specific to communities
      if (errorDetail.toLowerCase().includes("community")) {
        throw new Error("Community post failed: You may not have permission to post in this community");
      }

      throw new Error(errorDetail);
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

export async function getTweetMetrics(userId: string, tweetId: string): Promise<TweetMetrics> {
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

  const config = await getXApiConfig(userId);
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

export interface UserCommunity {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
}

/**
 * Search communities by keyword.
 * Note: X API v2 doesn't have an endpoint to list user's communities,
 * so we use search + manual input as fallback.
 */
export async function searchCommunities(userId: string, query: string): Promise<{
  communities: UserCommunity[];
  error?: string;
}> {
  const config = await getXApiConfig(userId);
  if (!config.accessToken) {
    return { communities: [], error: "Not authenticated" };
  }

  try {
    const res = await fetch(
      `${X_API_BASE}/communities/search?query=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      }
    );

    if (!res.ok) {
      if (res.status === 403) {
        return { communities: [], error: "Reconnect your X account to search communities" };
      }
      throw new Error(`Search failed: ${res.statusText}`);
    }

    const data = await res.json() as {
      data?: Array<{
        id: string;
        name: string;
        description?: string;
        member_count?: number;
      }>;
    };

    return { communities: data.data || [] };
  } catch (err) {
    return { communities: [], error: String(err) };
  }
}

/**
 * Get community info by ID (for validation)
 */
export async function getCommunityById(userId: string, communityId: string): Promise<{
  community?: UserCommunity;
  error?: string;
}> {
  const config = await getXApiConfig(userId);
  if (!config.accessToken) {
    return { error: "Not authenticated" };
  }

  try {
    const res = await fetch(`${X_API_BASE}/communities/${communityId}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Community not found: ${res.statusText}`);
    }

    const data = await res.json() as {
      data?: {
        id: string;
        name: string;
        description?: string;
        member_count?: number;
      };
    };

    return { community: data.data };
  } catch (err) {
    return { error: String(err) };
  }
}
