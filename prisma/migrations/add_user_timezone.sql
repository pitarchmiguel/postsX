-- Add timezone column to User table
-- Migration: add_user_timezone

-- Add timezone column with default value
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid';

-- Create index on timezone for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS "User_timezone_idx" ON "User"("timezone");
