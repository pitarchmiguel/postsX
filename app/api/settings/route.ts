import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import {
  DEFAULT_POSTING_WINDOWS,
  DEFAULT_CONTENT_CATEGORIES,
  DEFAULT_TIMEZONE,
} from "@/lib/constants";

const SETTING_KEYS = [
  "POSTING_WINDOWS",
  "CONTENT_CATEGORIES",
  "UTM_TEMPLATE",
  "SIMULATION_MODE",
  "TIMEZONE",
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "X_ACCESS_TOKEN",
  "X_REFRESH_TOKEN",
] as const;

const SENSITIVE_KEYS = new Set([
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "X_ACCESS_TOKEN",
  "X_REFRESH_TOKEN",
]);

const defaults: Record<string, string> = {
  POSTING_WINDOWS: JSON.stringify(DEFAULT_POSTING_WINDOWS),
  CONTENT_CATEGORIES: JSON.stringify(DEFAULT_CONTENT_CATEGORIES),
  UTM_TEMPLATE: "",
  SIMULATION_MODE: "true",
  TIMEZONE: DEFAULT_TIMEZONE,
};

async function getSetting(key: string): Promise<string> {
  const setting = await db.setting.findUnique({
    where: { key },
  });
  return setting?.valueJson ?? defaults[key] ?? "{}";
}

function isXApiConfiguredFromEnv(): boolean {
  return !!(process.env.X_ACCESS_TOKEN || process.env.X_CLIENT_ID);
}

async function isXApiConfiguredFromDb(): Promise<boolean> {
  const settings = await db.setting.findMany({
    where: {
      key: { in: ["X_ACCESS_TOKEN", "X_CLIENT_ID"] },
    },
  });
  return settings.some((s) => s.valueJson && s.valueJson !== "{}" && s.valueJson !== "");
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings: Record<string, unknown> = {};

    // Get global settings
    for (const key of SETTING_KEYS) {
      if (SENSITIVE_KEYS.has(key)) continue;
      const value = await getSetting(key);
      try {
        settings[key] = JSON.parse(value);
      } catch {
        settings[key] = value;
      }
    }

    // Get user from database (with X credentials)
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: {
        xAccessToken: true,
        xClientId: true,
        xRefreshToken: true,
        xUsername: true,
        xName: true,
        xProfileImageUrl: true,
      },
    });

    // Check if X is configured (Client ID/Secret from Settings, tokens from User)
    const appClientId = await getSetting("X_CLIENT_ID");
    const appClientSecret = await getSetting("X_CLIENT_SECRET");
    const hasAppCreds = !!(appClientId && appClientId !== "{}" && appClientSecret && appClientSecret !== "{}");

    settings.X_API_CONFIGURED = !!(user?.xAccessToken);
    settings.X_CREDENTIALS_SET = {
      hasClientId: hasAppCreds,
      hasClientSecret: hasAppCreds,
      hasAccessToken: !!user?.xAccessToken,
      hasRefreshToken: !!user?.xRefreshToken,
    };

    settings.X_USERNAME = user?.xUsername || null;
    settings.X_NAME = user?.xName || null;
    settings.X_PROFILE_IMAGE_URL = user?.xProfileImageUrl || null;
    settings.X_ACCOUNT_DISPLAY =
      user?.xUsername && user?.xName
        ? `@${user.xUsername} (${user.xName})`
        : user?.xUsername
          ? `@${user.xUsername}`
          : user?.xName || null;

    // Check if current user is admin
    settings.IS_ADMIN = await isAdmin();

    return Response.json(settings);
  } catch (error) {
    console.error("Settings GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Separate user-specific X credentials from global settings
    const userUpdates: Record<string, string | null> = {};
    const globalSettings: string[] = [];

    for (const key of Object.keys(body)) {
      if (!SETTING_KEYS.includes(key as (typeof SETTING_KEYS)[number])) continue;

      const raw = body[key];
      if (raw === undefined || raw === null) continue;
      const value = typeof raw === "string" ? raw : JSON.stringify(raw);

      // X tokens go to User table
      if (key === "X_ACCESS_TOKEN") {
        userUpdates.xAccessToken = value || null;
      } else if (key === "X_REFRESH_TOKEN") {
        userUpdates.xRefreshToken = value || null;
      }
      // X Client ID/Secret stay in Settings (app-level config)
      else if (key === "X_CLIENT_ID" || key === "X_CLIENT_SECRET") {
        if (value === "") continue;
        await db.setting.upsert({
          where: { key },
          create: { key, valueJson: value },
          update: { valueJson: value },
        });
      }
      // Other settings go to Settings table
      else {
        if (SENSITIVE_KEYS.has(key) && value === "") continue;
        await db.setting.upsert({
          where: { key },
          create: { key, valueJson: value },
          update: { valueJson: value },
        });
      }
    }

    // Update user's X credentials if any
    if (Object.keys(userUpdates).length > 0) {
      await db.user.update({
        where: { id: currentUser.id },
        data: userUpdates,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
