-- ============================================
-- COMPLETE MULTI-USER MIGRATION
-- Execute this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS "User_supabaseUserId_idx" ON "User"("supabaseUserId");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Step 3: Add userId to Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 4: Create indexes on Post
CREATE INDEX IF NOT EXISTS "Post_userId_idx" ON "Post"("userId");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post"("status");
CREATE INDEX IF NOT EXISTS "Post_scheduledAt_idx" ON "Post"("scheduledAt");

-- ============================================
-- MIGRATION COMPLETE
-- Now run the queries below ONE BY ONE
-- ============================================

-- Query 1: Check current Supabase Auth users
-- Copy your user's UUID from here
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at
LIMIT 10;

-- Query 2: Create your user in the User table
-- REPLACE 'your-supabase-user-id-here' with your UUID from Query 1
-- REPLACE 'your-email@example.com' with your email
-- The id is auto-generated using gen_random_uuid()
INSERT INTO "User" ("id", "email", "supabaseUserId")
VALUES (
  gen_random_uuid()::text,
  'your-email@example.com',
  'your-supabase-user-id-here'
)
ON CONFLICT ("supabaseUserId") DO NOTHING
RETURNING *;

-- Query 3: Migrate X tokens from Settings to User
-- This copies X_ACCESS_TOKEN, X_CLIENT_ID, etc. to your user
UPDATE "User"
SET
  "xAccessToken" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_ACCESS_TOKEN'),
  "xClientId" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_CLIENT_ID'),
  "xRefreshToken" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_REFRESH_TOKEN'),
  "xUsername" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_USERNAME'),
  "xName" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_NAME'),
  "xProfileImageUrl" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_PROFILE_IMAGE_URL')
WHERE "email" = 'your-email@example.com';

-- Query 4: Assign all existing posts to your user
UPDATE "Post"
SET "userId" = (SELECT "id" FROM "User" WHERE "email" = 'your-email@example.com')
WHERE "userId" IS NULL;

-- Query 5: Verify migration
-- All these queries should return expected results

-- Check users
SELECT "id", "email", "xUsername" FROM "User";

-- Check post count per user
SELECT u."email", COUNT(p."id") as post_count
FROM "User" u
LEFT JOIN "Post" p ON p."userId" = u."id"
GROUP BY u."id", u."email";

-- Check posts without user (should be 0)
SELECT COUNT(*) as posts_without_user FROM "Post" WHERE "userId" IS NULL;

-- Query 6 (OPTIONAL): Delete old X settings from Settings table
-- Only run this after verifying everything works!
-- DELETE FROM "Setting" WHERE "key" IN (
--   'X_ACCESS_TOKEN',
--   'X_CLIENT_ID',
--   'X_REFRESH_TOKEN',
--   'X_USERNAME',
--   'X_NAME',
--   'X_PROFILE_IMAGE_URL'
-- );
