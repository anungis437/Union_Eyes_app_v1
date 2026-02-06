-- Update admin users to super_admin role
-- Run this on unioneyes-staging-db

UPDATE organization_members 
SET 
  role = 'super_admin',
  updated_at = NOW()
WHERE 
  user_id IN (
    'user_37vyDm8LHilksYNuVBcenvdktBW', -- a_nungisa@yahoo.ca
    'user_37Zo7OrvP4jy0J0MU5APfkDtE2V'  -- michel@nungisalaw.ca
  )
  AND organization_id = '458a56cb-251a-4c91-a0b5-81bb8ac39087';

-- Verify the update
SELECT 
  user_id,
  organization_id,
  role,
  updated_at
FROM organization_members
WHERE user_id IN (
  'user_37vyDm8LHilksYNuVBcenvdktBW',
  'user_37Zo7OrvP4jy0J0MU5APfkDtE2V'
)
AND organization_id = '458a56cb-251a-4c91-a0b5-81bb8ac39087';
