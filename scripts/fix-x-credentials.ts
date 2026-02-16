/**
 * Script to fix X OAuth credentials in database
 * This ensures credentials are stored correctly without extra quotes or whitespace
 */
import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("=== X OAuth Credentials Fixer ===\n");

  // Check current state
  const clientIdSetting = await prisma.setting.findUnique({
    where: { key: "X_CLIENT_ID" },
  });
  const clientSecretSetting = await prisma.setting.findUnique({
    where: { key: "X_CLIENT_SECRET" },
  });

  console.log("Current state:");
  if (clientIdSetting) {
    console.log(`  Client ID: ${JSON.stringify(clientIdSetting.valueJson)}`);
    console.log(`    Raw length: ${clientIdSetting.valueJson.length}`);
    console.log(`    Type: ${typeof clientIdSetting.valueJson}`);
  } else {
    console.log("  Client ID: Not set");
  }

  if (clientSecretSetting) {
    console.log(`  Client Secret: ***${clientSecretSetting.valueJson.slice(-10)}`);
    console.log(`    Raw length: ${clientSecretSetting.valueJson.length}`);
  } else {
    console.log("  Client Secret: Not set");
  }

  console.log("\nWould you like to:");
  console.log("1. Set new credentials");
  console.log("2. Clean/fix existing credentials");
  console.log("3. Delete credentials");
  console.log("4. Exit");

  const choice = await question("\nChoice (1-4): ");

  if (choice === "1") {
    const clientId = await question("\nEnter Client ID: ");
    const clientSecret = await question("Enter Client Secret: ");

    if (!clientId || !clientSecret) {
      console.log("❌ Both Client ID and Secret are required");
      return;
    }

    // Store as plain strings (no JSON encoding)
    await prisma.setting.upsert({
      where: { key: "X_CLIENT_ID" },
      create: { key: "X_CLIENT_ID", valueJson: clientId.trim() },
      update: { valueJson: clientId.trim() },
    });

    await prisma.setting.upsert({
      where: { key: "X_CLIENT_SECRET" },
      create: { key: "X_CLIENT_SECRET", valueJson: clientSecret.trim() },
      update: { valueJson: clientSecret.trim() },
    });

    console.log("\n✅ Credentials saved!");
    console.log(`   Client ID: ${clientId.trim().substring(0, 10)}...`);
    console.log(`   Client Secret: ***${clientSecret.trim().slice(-4)}`);
  } else if (choice === "2") {
    let fixed = false;

    if (clientIdSetting) {
      const cleaned = cleanValue(clientIdSetting.valueJson);
      if (cleaned !== clientIdSetting.valueJson) {
        await prisma.setting.update({
          where: { key: "X_CLIENT_ID" },
          data: { valueJson: cleaned },
        });
        console.log("✅ Client ID cleaned");
        fixed = true;
      }
    }

    if (clientSecretSetting) {
      const cleaned = cleanValue(clientSecretSetting.valueJson);
      if (cleaned !== clientSecretSetting.valueJson) {
        await prisma.setting.update({
          where: { key: "X_CLIENT_SECRET" },
          data: { valueJson: cleaned },
        });
        console.log("✅ Client Secret cleaned");
        fixed = true;
      }
    }

    if (!fixed) {
      console.log("ℹ️  Credentials are already clean");
    }
  } else if (choice === "3") {
    const confirm = await question("Are you sure? (yes/no): ");
    if (confirm.toLowerCase() === "yes") {
      if (clientIdSetting) {
        await prisma.setting.delete({ where: { key: "X_CLIENT_ID" } });
      }
      if (clientSecretSetting) {
        await prisma.setting.delete({ where: { key: "X_CLIENT_SECRET" } });
      }
      console.log("✅ Credentials deleted");
    }
  } else {
    console.log("Exiting...");
  }

  rl.close();
  await prisma.$disconnect();
}

function cleanValue(raw: string): string {
  let cleaned = raw.trim();

  // If it's a JSON string, parse it
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try {
      cleaned = JSON.parse(cleaned);
    } catch {
      // If parsing fails, just remove the quotes
      cleaned = cleaned.slice(1, -1);
    }
  }

  return cleaned;
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  prisma.$disconnect();
  process.exit(1);
});
