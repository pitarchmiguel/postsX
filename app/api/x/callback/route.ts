import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/x-oauth";
import { verifyXConnection } from "@/lib/x-api";
import { getCurrentUser } from "@/lib/auth";

const PKCE_COOKIE = "x_oauth_pkce";

function getRedirectUri(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}/api/x/callback`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = new URL("/settings", request.url);

  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    baseUrl.searchParams.set("error", "Not+authenticated");
    return Response.redirect(baseUrl);
  }

  if (error) {
    const desc = searchParams.get("error_description") || error;
    baseUrl.searchParams.set("error", desc);
    return Response.redirect(baseUrl);
  }

  if (!code || !state) {
    baseUrl.searchParams.set("error", "Missing+code+or+state");
    return Response.redirect(baseUrl);
  }

  const cookieStore = await cookies();
  const pkceRaw = cookieStore.get(PKCE_COOKIE)?.value;
  cookieStore.delete(PKCE_COOKIE);

  if (!pkceRaw) {
    baseUrl.searchParams.set("error", "Session+expired.+Try+again.");
    return Response.redirect(baseUrl);
  }

  let pkce: { codeVerifier: string; state: string; userId: string };
  try {
    pkce = JSON.parse(pkceRaw);
  } catch {
    baseUrl.searchParams.set("error", "Invalid+session");
    return Response.redirect(baseUrl);
  }

  if (pkce.state !== state) {
    baseUrl.searchParams.set("error", "Invalid+state");
    return Response.redirect(baseUrl);
  }

  // Validate that the current user matches who initiated OAuth
  // This prevents session race conditions where tokens get saved to wrong user
  if (pkce.userId !== user.id) {
    baseUrl.searchParams.set("error", "Session+mismatch.+Please+reconnect.");
    return Response.redirect(baseUrl);
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

  console.log("[X OAuth] Processing callback", {
    hasCode: !!code,
    hasState: !!state,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    userId: user.id,
  });

  if (!clientId || !clientSecret) {
    console.error("[X OAuth] Missing credentials in callback", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    baseUrl.searchParams.set("error", "Client+credentials+not+configured");
    return Response.redirect(baseUrl);
  }

  try {
    const redirectUri = getRedirectUri(request);

    console.log("[X OAuth] Exchanging code for tokens", {
      codeLength: code.length,
      redirectUri,
      clientIdPrefix: clientId?.substring(0, 10),
    });

    const { accessToken, refreshToken } = await exchangeCodeForTokens({
      clientId,
      clientSecret,
      code,
      codeVerifier: pkce.codeVerifier,
      redirectUri,
    });

    console.log("[X OAuth] Tokens received", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    // Save tokens to User table (per-user)
    await db.user.update({
      where: { id: user.id },
      data: {
        xAccessToken: accessToken,
        xRefreshToken: refreshToken || null,
        xClientId: clientId,
      },
    });

    // Verify connection and update profile
    const verify = await verifyXConnection(user.id);
    if (verify.success) {
      await db.user.update({
        where: { id: user.id },
        data: {
          xUsername: verify.username || null,
          xName: verify.name || null,
          xProfileImageUrl: verify.profileImageUrl || null,
        },
      });
    }

    console.log("[X OAuth] Connection successful", {
      username: verify.username,
      userId: user.id,
    });

    baseUrl.searchParams.set("connected", verify.username || "1");
  } catch (err) {
    console.error("[X OAuth] Token exchange failed", {
      error: err,
      errorMessage: String(err),
      userId: user.id,
    });
    baseUrl.searchParams.set("error", encodeURIComponent(String(err)));
  }

  return Response.redirect(baseUrl);
}
