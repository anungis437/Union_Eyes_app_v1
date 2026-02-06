-- Link Clerk User to Seed Data
-- Instructions:
-- 1. This updates a seed user's email to match your Clerk account
-- 2. Assigns test claims to that user's UUID for workbench testing
-- 3. Clerk authentication will work because it matches by email

-- Update the seed user's email to match your Clerk account
UPDATE user_management.users 
SET 
  email = 'info@nzilaventures.com',
  first_name = 'Super',
  last_name = 'Admin',
  display_name = 'Super Admin',
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = '00000000-0000-0000-0000-000000000101';

-- Assign test claims to this user for workbench testing
UPDATE claims 
SET 
  assigned_to = '00000000-0000-0000-0000-000000000101',
  assigned_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE claim_number IN ('CLM-2025-003', 'CLM-2025-004');

-- Verify the updates
SELECT 
  u.user_id,
  u.email,
  u.first_name,
  u.last_name,
  COUNT(c.claim_id) as assigned_claims_count
FROM user_management.users u
LEFT JOIN claims c ON c.assigned_to = u.user_id
WHERE u.user_id = '00000000-0000-0000-0000-000000000101'
GROUP BY u.user_id, u.email, u.first_name, u.last_name;

-- Show assigned claims with details
SELECT 
  c.claim_number,
  c.claim_type,
  c.status,
  c.priority,
  c.incident_date,
  c.assigned_to,
  u.email as assigned_to_email
FROM claims c
LEFT JOIN user_management.users u ON c.assigned_to = u.user_id
WHERE c.assigned_to = '00000000-0000-0000-0000-000000000101'
ORDER BY c.created_at DESC;
