-- ============================================
-- COMPLETE MULTI-USER MIGRATION (FIXED)
-- Execute this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Create User table (with proper UUID generation)
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
-- NOW FOLLOW THE STEPS BELOW
-- ============================================

-- ============================================
-- STEP 1: Get your Supabase User ID
-- ============================================
-- Run this query and COPY your UUID:

SELECT id, email, created_at
FROM auth.users
ORDER BY created_at
LIMIT 10;

-- IMPORTANT: Copy the "id" (UUID) of YOUR user from the results above!


-- ============================================
-- STEP 2: Create your user
-- ============================================
-- BEFORE running this, you MUST:
-- 1. Replace YOUR_REAL_EMAIL with your actual email (e.g., miguel@example.com)
-- 2. Replace YOUR_SUPABASE_UUID with the UUID you copied from STEP 1
--
-- Example:
-- INSERT INTO "User" ("id", "email", "supabaseUserId")
-- VALUES (gen_random_uuid()::text, 'miguel@example.com', 'a1b2c3d4-5678-90ab-cdef-1234567890ab')

INSERT INTO "User" ("id", "email", "supabaseUserId")
VALUES (
  gen_random_uuid()::text,
  'YOUR_REAL_EMAIL',
  'YOUR_SUPABASE_UUID'
)
ON CONFLICT ("supabaseUserId") DO UPDATE
SET "email" = EXCLUDED."email"
RETURNING *;

-- You should see your user created with an id, email, and supabaseUserId


-- ============================================
-- STEP 3: Migrate X tokens to your user
-- ============================================
-- BEFORE running: Replace YOUR_REAL_EMAIL with your email

UPDATE "User"
SET
  "xAccessToken" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_ACCESS_TOKEN'),
  "xClientId" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_CLIENT_ID'),
  "xRefreshToken" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_REFRESH_TOKEN'),
  "xUsername" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_USERNAME'),
  "xName" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_NAME'),
  "xProfileImageUrl" = (SELECT "valueJson" FROM "Setting" WHERE "key" = 'X_PROFILE_IMAGE_URL')
WHERE "email" = 'YOUR_REAL_EMAIL';

-- Should return: UPDATE 1


-- ============================================
-- STEP 4: Assign all posts to your user
-- ============================================
-- BEFORE running: Replace YOUR_REAL_EMAIL with your email

UPDATE "Post"
SET "userId" = (SELECT "id" FROM "User" WHERE "email" = 'YOUR_REAL_EMAIL')
WHERE "userId" IS NULL;

-- Should return: UPDATE X (where X is your number of posts)


-- ============================================
-- STEP 5: VERIFY everything worked
-- ============================================

-- Check users (should see your user with X username)
SELECT "id", "email", "xUsername", "xAccessToken" IS NOT NULL as has_token
FROM "User";

-- Check posts per user (should see your post count)
SELECT
  u."email",
  COUNT(p."id") as post_count
FROM "User" u
LEFT JOIN "Post" p ON p."userId" = u."id"
GROUP BY u."id", u."email";

-- Check posts without user (should be 0)
SELECT COUNT(*) as orphaned_posts
FROM "Post"
WHERE "userId" IS NULL;

-- ============================================
-- STEP 6 (OPTIONAL): Clean up old Settings
-- ============================================
-- Only run this AFTER verifying everything works!
-- Uncomment to execute:

-- DELETE FROM "Setting"
-- WHERE "key" IN (
--   'X_ACCESS_TOKEN',
--   'X_CLIENT_ID',
--   'X_REFRESH_TOKEN',
--   'X_USERNAME',
--   'X_NAME',
--   'X_PROFILE_IMAGE_URL'
-- );
