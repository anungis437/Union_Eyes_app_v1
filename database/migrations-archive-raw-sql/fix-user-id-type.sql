-- Migration: Fix tenant_users.user_id column type from UUID to VARCHAR
-- Reason: Clerk user IDs are strings like "user_xxxxx", not UUIDs
-- Date: 2025-11-12

-- Step 1: Backup existing data (if any)
CREATE TABLE IF NOT EXISTS user_management.tenant_users_backup AS 
SELECT * FROM user_management.tenant_users;

-- Step 2: Drop foreign key constraint if it exists
ALTER TABLE user_management.tenant_users 
DROP CONSTRAINT IF EXISTS tenant_users_user_id_users_user_id_fk;

-- Step 3: Change user_id column type from UUID to VARCHAR(255)
ALTER TABLE user_management.tenant_users 
ALTER COLUMN user_id TYPE VARCHAR(255);

-- Step 4: Add index for performance on string lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id 
ON user_management.tenant_users(user_id);

-- Step 5: Insert your admin user (replace with your actual Clerk user ID)
-- You can find your Clerk user ID in the browser console or Clerk dashboard
INSERT INTO user_management.tenant_users 
  (tenant_id, user_id, role, is_active, joined_at)
VALUES
  (
    (SELECT tenant_id FROM tenant_management.tenants LIMIT 1), -- Get first tenant
    'user_35NlrrNcfTv0DMh2kzBHyXZRtpb', -- Your Clerk user ID from the logs
    'admin',
    true,
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  character_maximum_length 
FROM information_schema.columns 
WHERE table_schema = 'user_management' 
  AND table_name = 'tenant_users' 
  AND column_name = 'user_id';
