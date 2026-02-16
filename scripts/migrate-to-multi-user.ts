/**
 * Migration script: Convert single-user app to multi-user
 *
 * This script:
 * 1. Creates User table in database
 * 2. Migrates existing posts to a user
 * 3. Migrates X tokens from Settings to User table
 *
 * Run with: npx tsx scripts/migrate-to-multi-user.ts
 */

import { db } from "../lib/db.js";

async function migrate() {
  console.log("🚀 Starting migration to multi-user architecture...\n");

  try {
    // Step 1: Apply database migration
    console.log("📝 Step 1: Database migration");
    console.log("  Run this SQL in Supabase Dashboard SQL Editor:");
    console.log("  ----------------------------------------");
    console.log(`
-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL UNIQUE,
  "supabaseUserId" TEXT NOT NULL UNIQUE,
  "xAccessToken" TEXT,
  "xRefreshToken" TEXT,
  "xTokenExpiresAt" TIMESTAMP(3),
  "xClientId" TEXT,
  "xUsername" TEXT,
  "xName" TEXT,
  "xProfileImageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "User_supabaseUserId_idx" ON "User"("supabaseUserId");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Add userId to Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Create indexes on Post
CREATE INDEX IF NOT EXISTS "Post_userId_idx" ON "Post"("userId");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post"("status");
CREATE INDEX IF NOT EXISTS "Post_scheduledAt_idx" ON "Post"("scheduledAt");
    `);
    console.log("  ----------------------------------------\n");
    console.log("  ⚠️  Press Enter after running the SQL above...");

    // Wait for user confirmation
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });

    // Step 2: Check current state
    console.log("\n📊 Step 2: Checking current state...");

    const postCount = await db.post.count();
    console.log(`  Found ${postCount} existing posts`);

    const xSettings = await db.setting.findMany({
      where: {
        key: { in: ["X_ACCESS_TOKEN", "X_CLIENT_ID", "X_REFRESH_TOKEN"] },
      },
    });
    console.log(`  Found ${xSettings.length} X API settings`);

    // Step 3: Get or create migration user
    console.log("\n👤 Step 3: Setting up migration user...");
    console.log("  Enter the email of the user who should own the existing posts:");
    console.log("  (This should be YOUR email - the current Supabase user)");
    process.stdout.write("  Email: ");

    const email = await new Promise<string>(resolve => {
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });

    if (!email || !email.includes('@')) {
      throw new Error("Invalid email provided");
    }

    console.log(`\n  Looking up Supabase user: ${email}`);
    console.log("  Note: This user must exist in Supabase Auth");
    console.log("  Get Supabase user ID from: Supabase Dashboard > Authentication > Users");
    process.stdout.write("  Enter Supabase User ID: ");

    const supabaseUserId = await new Promise<string>(resolve => {
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });

    if (!supabaseUserId) {
      throw new Error("Supabase user ID required");
    }

    // Create or get user
    let user = await db.user.findUnique({
      where: { supabaseUserId },
    });

    if (!user) {
      console.log("  Creating new user in database...");
      user = await db.user.create({
        data: {
          email,
          supabaseUserId,
        },
      });
      console.log(`  ✓ User created with ID: ${user.id}`);
    } else {
      console.log(`  ✓ Using existing user: ${user.id}`);
    }

    // Step 4: Migrate X tokens
    if (xSettings.length > 0) {
      console.log("\n🔑 Step 4: Migrating X API tokens...");

      const xAccessToken = xSettings.find((s: typeof xSettings[0]) => s.key === "X_ACCESS_TOKEN")?.valueJson?.trim();
      const xClientId = xSettings.find((s: typeof xSettings[0]) => s.key === "X_CLIENT_ID")?.valueJson?.trim();
      const xRefreshToken = xSettings.find((s: typeof xSettings[0]) => s.key === "X_REFRESH_TOKEN")?.valueJson?.trim();

      await db.user.update({
        where: { id: user.id },
        data: {
          xAccessToken: xAccessToken || null,
          xClientId: xClientId || null,
          xRefreshToken: xRefreshToken || null,
        },
      });

      console.log("  ✓ X tokens migrated to user");

      // Optionally delete old settings
      console.log("\n  Delete old X settings from Settings table? (y/n)");
      process.stdout.write("  Choice: ");

      const deleteChoice = await new Promise<string>(resolve => {
        process.stdin.once('data', data => {
          resolve(data.toString().trim().toLowerCase());
        });
      });

      if (deleteChoice === 'y') {
        await db.setting.deleteMany({
          where: {
            key: { in: ["X_ACCESS_TOKEN", "X_CLIENT_ID", "X_REFRESH_TOKEN"] },
          },
        });
        console.log("  ✓ Old settings deleted");
      }
    }

    // Step 5: Migrate posts
    if (postCount > 0) {
      console.log(`\n📝 Step 5: Migrating ${postCount} posts to user...`);

      await db.post.updateMany({
        where: {
          userId: null,
        },
        data: {
          userId: user.id,
        },
      });

      console.log(`  ✓ All posts assigned to user ${user.id}`);
    }

    // Step 6: Verify migration
    console.log("\n✅ Step 6: Verifying migration...");

    const userPosts = await db.post.count({
      where: { userId: user.id },
    });
    console.log(`  ✓ User now has ${userPosts} posts`);

    const postsWithoutUser = await db.post.count({
      where: { userId: null },
    });

    if (postsWithoutUser > 0) {
      console.warn(`  ⚠️  Warning: ${postsWithoutUser} posts still without user`);
    }

    console.log("\n🎉 Migration complete!");
    console.log("\n📋 Next steps:");
    console.log("  1. Restart your dev server (Ctrl+C then npm run dev)");
    console.log("  2. Login with the email:", email);
    console.log("  3. You should see all your posts");
    console.log("  4. Other users can now register and have isolated data");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
    process.exit(0);
  }
}

migrate();
