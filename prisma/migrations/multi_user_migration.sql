-- Migration: Convert to multi-user architecture
-- Add User table and userId to Post

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
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

-- Add foreign key constraint (will be enforced after migration)
-- ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey"
-- FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
