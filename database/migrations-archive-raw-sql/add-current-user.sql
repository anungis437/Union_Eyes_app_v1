-- Add current logged-in user to test tenants
-- Replace 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb' with your actual Clerk user ID if different

-- Add to Union Local 123 as admin
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES (
  'union-local-123', 
  'user_35NlrrNcfTv0DMh2kzBHyXZRtpb', 
  'a1111111-1111-1111-1111-111111111111', 
  'Current User', 
  'currentuser@local123.union', 
  '555-9999', 
  'admin', 
  'active', 
  'Administration', 
  'System Administrator', 
  10, 
  'UL123-ADMIN'
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'admin',
  status = 'active';

-- Add to Workers Alliance as admin
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES (
  'workers-alliance', 
  'user_35NlrrNcfTv0DMh2kzBHyXZRtpb', 
  'b2222222-2222-2222-2222-222222222222', 
  'Current User', 
  'currentuser@workersalliance.org', 
  '555-9999', 
  'admin', 
  'active', 
  'Administration', 
  'System Administrator', 
  10, 
  'WA-ADMIN'
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'admin',
  status = 'active';

-- Add to Default Union as admin
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES (
  'default-union', 
  'user_35NlrrNcfTv0DMh2kzBHyXZRtpb', 
  '29cec18c-5df2-41c0-a7c8-73a9464c9d3b', 
  'Current User', 
  'currentuser@defaultunion.org', 
  '555-9999', 
  'admin', 
  'active', 
  'Administration', 
  'System Administrator', 
  10, 
  'DU-ADMIN'
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'admin',
  status = 'active';

-- Add to default tenant (for backward compatibility)
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES (
  'default-org', 
  'user_35NlrrNcfTv0DMh2kzBHyXZRtpb', 
  '00000000-0000-0000-0000-000000000001', 
  'Current User', 
  'currentuser@example.com', 
  '555-9999', 
  'admin', 
  'active', 
  'Administration', 
  'System Administrator', 
  10, 
  'DEFAULT-ADMIN'
)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'admin',
  status = 'active';

-- Verify the insertions
SELECT 
  om.user_id,
  om.name,
  om.email,
  om.role,
  om.membership_number,
  t.tenant_name
FROM organization_members om
JOIN tenant_management.tenants t ON om.tenant_id = t.tenant_id
WHERE om.user_id = 'user_35NlrrNcfTv0DMh2kzBHyXZRtpb'
ORDER BY t.tenant_name;
