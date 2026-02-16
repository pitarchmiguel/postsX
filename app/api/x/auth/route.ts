import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { generatePKCE, buildAuthUrl } from "@/lib/x-oauth";
import { getCurrentUser } from "@/lib/auth";

const PKCE_COOKIE = "x_oauth_pkce";
const PKCE_MAX_AGE = 600; // 10 min

function getRedirectUri(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;
  return `${base}/api/x/callback`;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user before initiating OAuth
    const user = await getCurrentUser();
    if (!user) {
      return Response.redirect(
        new URL("/settings?error=Not+authenticated", request.url)
      );
    }

  // Helper to safely extract setting value
  const getSetting = (setting: { valueJson: string } | null): string | null => {
    if (!setting?.valueJson) return null;
    const raw = setting.valueJson;
    // Handle both plain strings and JSON-stringified strings
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed.trim() : null;
    } catch {
      return raw.trim();
    }
  };

  const clientIdSetting = await db.setting.findUnique({ where: { key: "X_CLIENT_ID" } });
  const clientSecretSetting = await db.setting.findUnique({ where: { key: "X_CLIENT_SECRET" } });

  const clientId = process.env.X_CLIENT_ID || getSetting(clientIdSetting);
  const clientSecret = process.env.X_CLIENT_SECRET || getSetting(clientSecretSetting);

  console.log("[X OAuth] Initiating OAuth flow", {
    hasEnvClientId: !!process.env.X_CLIENT_ID,
    hasDbClientId: !!getSetting(clientIdSetting),
    clientIdLength: clientId?.length,
    clientSecretLength: clientSecret?.length,
    redirectUri: getRedirectUri(request),
    userId: user.id,
  });

  if (!clientId || !clientSecret) {
    console.error("[X OAuth] Missing credentials", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    return Response.redirect(
      new URL("/settings?error=Configure+Client+ID+and+Client+Secret+first", request.url)
    );
  }

  const redirectUri = getRedirectUri(request);
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(PKCE_COOKIE, JSON.stringify({
    codeVerifier,
    state,
    userId: user.id, // Track which user initiated OAuth to prevent session hijacking
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PKCE_MAX_AGE,
    path: "/",
  });

  const authUrl = buildAuthUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
  });

  console.log("[X OAuth] Redirecting to X", {
    authUrlLength: authUrl.length,
    authUrlDomain: new URL(authUrl).hostname,
  });

  return Response.redirect(authUrl);
  } catch (error) {
    console.error("[X OAuth] Error in auth flow", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return Response.redirect(
      new URL("/settings?error=" + encodeURIComponent("OAuth initialization failed: " + String(error)), request.url)
    );
  }
}
