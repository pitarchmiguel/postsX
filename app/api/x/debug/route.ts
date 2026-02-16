import { db } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !(await isAdmin())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Helper to safely extract setting value
    const getSetting = (setting: { valueJson: string } | null): string | null => {
      if (!setting?.valueJson) return null;
      const raw = setting.valueJson;
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string" ? parsed.trim() : null;
      } catch {
        return raw.trim();
      }
    };

    // Get X credentials from environment and database
    const envClientId = process.env.X_CLIENT_ID;
    const envClientSecret = process.env.X_CLIENT_SECRET;

    const clientIdSetting = await db.setting.findUnique({ where: { key: "X_CLIENT_ID" } });
    const clientSecretSetting = await db.setting.findUnique({ where: { key: "X_CLIENT_SECRET" } });

    const dbClientId = getSetting(clientIdSetting);
    const dbClientSecret = getSetting(clientSecretSetting);

    const clientId = envClientId || dbClientId;
    const clientSecret = envClientSecret || dbClientSecret;

    // Check for users with X connections
    const usersWithX = await db.user.findMany({
      where: { xAccessToken: { not: null } },
      select: {
        id: true,
        email: true,
        xUsername: true,
        xClientId: true,
      },
    });

    return Response.json({
      config: {
        hasEnvClientId: !!envClientId,
        hasEnvClientSecret: !!envClientSecret,
        hasDbClientId: !!dbClientId,
        hasDbClientSecret: !!dbClientSecret,
        activeClientId: clientId ? `${clientId.slice(0, 10)}...` : null,
        activeClientSecret: clientSecret ? "***" + clientSecret.slice(-4) : null,
        clientIdLength: clientId?.length,
        clientSecretLength: clientSecret?.length,
        dbRawClientId: clientIdSetting?.valueJson,
        dbRawClientSecret: clientSecretSetting?.valueJson ? "***" + clientSecretSetting.valueJson.slice(-10) : null,
      },
      users: {
        connectedCount: usersWithX.length,
        users: usersWithX.map(u => ({
          email: u.email,
          username: u.xUsername,
          clientId: u.xClientId ? `${u.xClientId.slice(0, 10)}...` : null,
        })),
      },
      urls: {
        authEndpoint: "/api/x/auth",
        callbackEndpoint: "/api/x/callback",
        expectedCallbacks: [
          "http://localhost:3000/api/x/callback",
          "https://www.postsx.xyz/api/x/callback",
        ],
      },
      scopes: ["tweet.read", "tweet.write", "users.read", "community.read"],
      troubleshooting: {
        step1: "Verify Client ID and Secret are correct in X Developer Portal",
        step2: "Ensure App Type is 'Web App' with OAuth 2.0 enabled",
        step3: "Check that callback URLs match exactly (case-sensitive)",
        step4: "Verify app is not suspended or pending review",
        step5: "Make sure you're using OAuth 2.0 credentials, not OAuth 1.0a",
        step6: "Check browser console for the exact 400 error details",
        step7: "Verify Client ID doesn't have quotes or extra whitespace",
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
