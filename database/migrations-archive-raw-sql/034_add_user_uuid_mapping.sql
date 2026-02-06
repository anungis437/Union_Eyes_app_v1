-- Migration 034: Add User UUID Mapping Table
-- Purpose: Map Clerk's text userId to UUID for foreign key relationships
-- Date: 2025-11-19

BEGIN;

-- Create user_uuid_mapping table
CREATE TABLE IF NOT EXISTS user_uuid_mapping (
  user_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups by Clerk user ID
CREATE INDEX IF NOT EXISTS idx_user_uuid_mapping_clerk_id ON user_uuid_mapping(clerk_user_id);

-- Migrate existing users from profiles table
INSERT INTO user_uuid_mapping (clerk_user_id)
SELECT DISTINCT user_id 
FROM profiles
WHERE user_id IS NOT NULL
ON CONFLICT (clerk_user_id) DO NOTHING;

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_uuid_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_uuid_mapping_updated_at
  BEFORE UPDATE ON user_uuid_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_user_uuid_mapping_updated_at();

COMMIT;
