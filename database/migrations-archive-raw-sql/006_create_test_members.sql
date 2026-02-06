-- Create test members for different tenants
-- This allows testing member directory with tenant switching

-- Members for Union Local 123 (a1111111-1111-1111-1111-111111111111)
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES
  ('union-local-123', 'user-001', 'a1111111-1111-1111-1111-111111111111', 'Alice Thompson', 'alice.thompson@local123.union', '555-0101', 'steward', 'active', 'Manufacturing', 'Line Supervisor', 8, 'UL123-001'),
  ('union-local-123', 'user-002', 'a1111111-1111-1111-1111-111111111111', 'Bob Martinez', 'bob.martinez@local123.union', '555-0102', 'member', 'active', 'Logistics', 'Forklift Operator', 5, 'UL123-002'),
  ('union-local-123', 'user-003', 'a1111111-1111-1111-1111-111111111111', 'Carol Zhang', 'carol.zhang@local123.union', '555-0103', 'officer', 'active', 'Administration', 'Union Representative', 10, 'UL123-003'),
  ('union-local-123', 'user-004', 'a1111111-1111-1111-1111-111111111111', 'David O''Brien', 'david.obrien@local123.union', '555-0104', 'member', 'active', 'Maintenance', 'Mechanic', 6, 'UL123-004'),
  ('union-local-123', 'user-005', 'a1111111-1111-1111-1111-111111111111', 'Emma Patel', 'emma.patel@local123.union', '555-0105', 'member', 'on-leave', 'Manufacturing', 'Quality Inspector', 4, 'UL123-005')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Members for Workers Alliance (b2222222-2222-2222-2222-222222222222)
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES
  ('workers-alliance', 'user-006', 'b2222222-2222-2222-2222-222222222222', 'Frank Anderson', 'frank.anderson@workersalliance.org', '555-0201', 'officer', 'active', 'Administration', 'Chief Steward', 15, 'WA-001'),
  ('workers-alliance', 'user-007', 'b2222222-2222-2222-2222-222222222222', 'Grace Liu', 'grace.liu@workersalliance.org', '555-0202', 'steward', 'active', 'Customer Service', 'Team Lead', 7, 'WA-002'),
  ('workers-alliance', 'user-008', 'b2222222-2222-2222-2222-222222222222', 'Henry Cooper', 'henry.cooper@workersalliance.org', '555-0203', 'member', 'active', 'IT', 'Systems Administrator', 3, 'WA-003'),
  ('workers-alliance', 'user-009', 'b2222222-2222-2222-2222-222222222222', 'Isabel Rodriguez', 'isabel.rodriguez@workersalliance.org', '555-0204', 'member', 'active', 'Logistics', 'Warehouse Manager', 9, 'WA-004'),
  ('workers-alliance', 'user-010', 'b2222222-2222-2222-2222-222222222222', 'James Kim', 'james.kim@workersalliance.org', '555-0205', 'member', 'inactive', 'Manufacturing', 'Assembly Worker', 2, 'WA-005'),
  ('workers-alliance', 'user-011', 'b2222222-2222-2222-2222-222222222222', 'Karen White', 'karen.white@workersalliance.org', '555-0206', 'steward', 'active', 'Maintenance', 'Facilities Coordinator', 11, 'WA-006')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Members for Default Union (29cec18c-5df2-41c0-a7c8-73a9464c9d3b)
INSERT INTO organization_members (
  organization_id, user_id, tenant_id, name, email, phone, role, status, 
  department, position, seniority, membership_number
) VALUES
  ('default-union', 'user-012', '29cec18c-5df2-41c0-a7c8-73a9464c9d3b', 'Linda Brown', 'linda.brown@defaultunion.org', '555-0301', 'admin', 'active', 'Administration', 'Union President', 20, 'DU-001'),
  ('default-union', 'user-013', '29cec18c-5df2-41c0-a7c8-73a9464c9d3b', 'Michael Green', 'michael.green@defaultunion.org', '555-0302', 'officer', 'active', 'Administration', 'Vice President', 18, 'DU-002'),
  ('default-union', 'user-014', '29cec18c-5df2-41c0-a7c8-73a9464c9d3b', 'Nancy Taylor', 'nancy.taylor@defaultunion.org', '555-0303', 'steward', 'active', 'Manufacturing', 'Shop Steward', 12, 'DU-003')
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Verification query
SELECT 
  t.tenant_name,
  COUNT(om.id) as member_count,
  COUNT(CASE WHEN om.role = 'steward' THEN 1 END) as stewards,
  COUNT(CASE WHEN om.status = 'active' THEN 1 END) as active_members
FROM tenant_management.tenants t
LEFT JOIN organization_members om ON t.tenant_id = om.tenant_id
WHERE t.deleted_at IS NULL AND om.deleted_at IS NULL
GROUP BY t.tenant_id, t.tenant_name
ORDER BY t.tenant_name;
