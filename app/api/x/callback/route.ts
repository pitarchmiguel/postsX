import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/x-oauth";
import { verifyXConnection } from "@/lib/x-api";

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

  let pkce: { codeVerifier: string; state: string };
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

  const clientId =
    process.env.X_CLIENT_ID ||
    (await db.setting.findUnique({ where: { key: "X_CLIENT_ID" } }))?.valueJson?.trim();
  const clientSecret =
    process.env.X_CLIENT_SECRET ||
    (await db.setting.findUnique({ where: { key: "X_CLIENT_SECRET" } }))?.valueJson?.trim();

  if (!clientId || !clientSecret) {
    baseUrl.searchParams.set("error", "Client+credentials+not+configured");
    return Response.redirect(baseUrl);
  }

  try {
    const redirectUri = getRedirectUri(request);
    const { accessToken, refreshToken } = await exchangeCodeForTokens({
      clientId,
      clientSecret,
      code,
      codeVerifier: pkce.codeVerifier,
      redirectUri,
    });

    await db.setting.upsert({
      where: { key: "X_ACCESS_TOKEN" },
      create: { key: "X_ACCESS_TOKEN", valueJson: accessToken },
      update: { valueJson: accessToken },
    });
    if (refreshToken) {
      await db.setting.upsert({
        where: { key: "X_REFRESH_TOKEN" },
        create: { key: "X_REFRESH_TOKEN", valueJson: refreshToken },
        update: { valueJson: refreshToken },
      });
    }

    const verify = await verifyXConnection();
    if (verify.success && verify.username) {
      await db.setting.upsert({
        where: { key: "X_USERNAME" },
        create: { key: "X_USERNAME", valueJson: verify.username },
        update: { valueJson: verify.username },
      });
    }
    if (verify.success && verify.name) {
      await db.setting.upsert({
        where: { key: "X_NAME" },
        create: { key: "X_NAME", valueJson: verify.name },
        update: { valueJson: verify.name },
      });
    }
    if (verify.success && verify.profileImageUrl) {
      await db.setting.upsert({
        where: { key: "X_PROFILE_IMAGE_URL" },
        create: { key: "X_PROFILE_IMAGE_URL", valueJson: verify.profileImageUrl },
        update: { valueJson: verify.profileImageUrl },
      });
    }

    baseUrl.searchParams.set("connected", verify.username || "1");
  } catch (err) {
    baseUrl.searchParams.set("error", encodeURIComponent(String(err)));
  }

  return Response.redirect(baseUrl);
}
