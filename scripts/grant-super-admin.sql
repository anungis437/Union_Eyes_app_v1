-- Grant super admin access to user_35NlrrNcfTv0DMh2kzBHyXZRtpb across all organizations
-- This script adds the user to organization_users table with admin role

-- First, let's see what tenants exist
SELECT tenant_id, tenant_name, tenant_slug 
FROM tenant_management.tenants
ORDER BY tenant_name;

-- Add user to organization_users with admin role for ALL tenants
INSERT INTO user_management.organization_users (
  organization_id, user_id, role, is_active, joined_at
)
SELECT 
  t.tenant_id,
  'user_35NlrrNcfTv0DMh2kzBHyXZRtpb',
  'admin',
  true,
  NOW()
FROM tenant_management.tenants t
ON CONFLICT (organization_id, user_id) 
DO UPDATE SET 
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- Verify the grants
SELECT 
  tu.user_id,
  tu.role,
  tu.is_active,
  t.tenant_name,
  t.tenant_slug
FROM user_management.organization_users tu
JOIN tenant_management.tenants t ON tu.organization_id = t.tenant_id
WHERE tu.user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb'
ORDER BY t.tenant_name;
