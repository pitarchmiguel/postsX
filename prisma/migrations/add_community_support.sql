-- Migration: Add communityId support for X Communities
-- This adds an optional communityId field to the Post table
-- NULL means regular feed, non-NULL means post to specific community

-- Add communityId column to Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "communityId" TEXT;

-- Add index for faster queries by community (optional but recommended)
CREATE INDEX IF NOT EXISTS "Post_communityId_idx" ON "Post"("communityId");

-- Verify the column was added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'Post' AND column_name = 'communityId';
