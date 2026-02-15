import { NextRequest } from "next/server";
import { db } from "@/lib/db";
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
  const settings: Record<string, unknown> = {};

  for (const key of SETTING_KEYS) {
    if (SENSITIVE_KEYS.has(key)) continue;
    const value = await getSetting(key);
    try {
      settings[key] = JSON.parse(value);
    } catch {
      settings[key] = value;
    }
  }

  const fromEnv = isXApiConfiguredFromEnv();
  const fromDb = await isXApiConfiguredFromDb();
  settings.X_API_CONFIGURED = fromEnv || fromDb;

  const xCreds = await db.setting.findMany({
    where: {
      key: {
        in: [
          "X_CLIENT_ID",
          "X_CLIENT_SECRET",
          "X_ACCESS_TOKEN",
          "X_REFRESH_TOKEN",
          "X_USERNAME",
          "X_NAME",
          "X_PROFILE_IMAGE_URL",
        ],
      },
    },
  });
  const credMap = Object.fromEntries(xCreds.map((s) => [s.key, s.valueJson]));
  settings.X_CREDENTIALS_SET = {
    hasClientId: !!(credMap.X_CLIENT_ID && credMap.X_CLIENT_ID !== "{}"),
    hasClientSecret: !!(credMap.X_CLIENT_SECRET && credMap.X_CLIENT_SECRET !== "{}"),
    hasAccessToken: !!(credMap.X_ACCESS_TOKEN && credMap.X_ACCESS_TOKEN !== "{}"),
    hasRefreshToken: !!(credMap.X_REFRESH_TOKEN && credMap.X_REFRESH_TOKEN !== "{}"),
  };

  const username = credMap.X_USERNAME?.trim();
  const name = credMap.X_NAME?.trim();
  const profileImageUrl = credMap.X_PROFILE_IMAGE_URL?.trim();
  settings.X_USERNAME = username || null;
  settings.X_NAME = name || null;
  settings.X_PROFILE_IMAGE_URL = profileImageUrl || null;
  settings.X_ACCOUNT_DISPLAY =
    username && name
      ? `@${username} (${name})`
      : username
        ? `@${username}`
        : name || null;

  return Response.json(settings);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    for (const key of Object.keys(body)) {
      if (SETTING_KEYS.includes(key as (typeof SETTING_KEYS)[number])) {
        const raw = body[key];
        if (raw === undefined || raw === null) continue;
        const value =
          typeof raw === "string" ? raw : JSON.stringify(raw);
        if (SENSITIVE_KEYS.has(key) && value === "") continue;
        await db.setting.upsert({
          where: { key },
          create: { key, valueJson: value },
          update: { valueJson: value },
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
