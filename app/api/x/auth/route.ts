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
  // Authenticate user before initiating OAuth
  const user = await getCurrentUser();
  if (!user) {
    return Response.redirect(
      new URL("/settings?error=Not+authenticated", request.url)
    );
  }

  const clientId =
    process.env.X_CLIENT_ID ||
    (await db.setting.findUnique({ where: { key: "X_CLIENT_ID" } }))?.valueJson?.trim();
  const clientSecret =
    process.env.X_CLIENT_SECRET ||
    (await db.setting.findUnique({ where: { key: "X_CLIENT_SECRET" } }))?.valueJson?.trim();

  if (!clientId || !clientSecret) {
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

  return Response.redirect(authUrl);
}
