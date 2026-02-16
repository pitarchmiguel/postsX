/**
 * Script to check X OAuth configuration
 */
import { db } from "@/lib/db";

async function main() {
  console.log("=== Checking X OAuth Configuration ===\n");

  // Check environment variables
  console.log("Environment variables:");
  console.log("  X_CLIENT_ID:", process.env.X_CLIENT_ID ? `Set (${process.env.X_CLIENT_ID.length} chars)` : "Not set");
  console.log("  X_CLIENT_SECRET:", process.env.X_CLIENT_SECRET ? `Set (${process.env.X_CLIENT_SECRET.length} chars)` : "Not set");
  console.log();

  // Check database settings
  console.log("Database settings:");
  const clientIdSetting = await db.setting.findUnique({ where: { key: "X_CLIENT_ID" } });
  const clientSecretSetting = await db.setting.findUnique({ where: { key: "X_CLIENT_SECRET" } });

  if (clientIdSetting) {
    const value = clientIdSetting.valueJson;
    console.log("  X_CLIENT_ID in DB:");
    console.log("    Raw value:", JSON.stringify(value));
    console.log("    Type:", typeof value);
    console.log("    Length:", value?.length);
    console.log("    Trimmed:", value?.trim?.());
  } else {
    console.log("  X_CLIENT_ID: Not found in database");
  }

  if (clientSecretSetting) {
    const value = clientSecretSetting.valueJson;
    console.log("  X_CLIENT_SECRET in DB:");
    console.log("    Raw value:", JSON.stringify(value));
    console.log("    Type:", typeof value);
    console.log("    Length:", value?.length);
    console.log("    Has trim method:", typeof value?.trim === 'function');
  } else {
    console.log("  X_CLIENT_SECRET: Not found in database");
  }
  console.log();

  // Check users with X tokens
  const usersWithTokens = await db.user.findMany({
    where: {
      OR: [
        { xAccessToken: { not: null } },
        { xRefreshToken: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      xUsername: true,
      xAccessToken: true,
      xRefreshToken: true,
      xClientId: true,
    },
  });

  console.log(`Users with X tokens: ${usersWithTokens.length}`);
  for (const user of usersWithTokens) {
    console.log(`  - ${user.email} (@${user.xUsername || 'N/A'})`);
    console.log(`    Access Token: ${user.xAccessToken ? `Set (${user.xAccessToken.length} chars)` : 'Not set'}`);
    console.log(`    Refresh Token: ${user.xRefreshToken ? `Set (${user.xRefreshToken.length} chars)` : 'Not set'}`);
    console.log(`    Client ID: ${user.xClientId ? `${user.xClientId.substring(0, 10)}...` : 'Not set'}`);
  }

  await db.$disconnect();
}

main().catch(console.error);
