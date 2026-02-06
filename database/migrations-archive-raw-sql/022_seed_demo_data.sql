-- Seed data for testing the claims system
-- Creates a default tenant and demo claims

-- Create default tenant if not exists
INSERT INTO tenant_management.tenants (tenant_id, tenant_slug, tenant_name, subscription_tier, status)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'default-org', 'Default Organization', 'free', 'active')
ON CONFLICT (tenant_slug) DO NOTHING;

-- Create test users if not exists
INSERT INTO user_management.users (user_id, email, first_name, last_name, display_name, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000101'::uuid, 'member1@example.com', 'John', 'Smith', 'John Smith', true),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'member2@example.com', 'Jane', 'Doe', 'Jane Doe', true),
  ('00000000-0000-0000-0000-000000000103'::uuid, 'steward@example.com', 'Mike', 'Wilson', 'Mike Wilson', true)
ON CONFLICT (email) DO NOTHING;

-- Link users to tenant
INSERT INTO user_management.tenant_users (tenant_user_id, tenant_id, user_id, role)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'member'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000102'::uuid, 'member'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000103'::uuid, 'steward')
ON CONFLICT DO NOTHING;

-- Create sample claims
INSERT INTO claims (
  claim_number, tenant_id, member_id, is_anonymous, claim_type, status, priority,
  incident_date, location, description, desired_outcome, witnesses_present, previously_reported
) VALUES
  (
    'CLM-2025-001',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'workplace_safety',
    'under_review',
    'high',
    '2025-11-10',
    'Manufacturing Floor - Building A',
    'Safety equipment was not provided for the welding operation. I was told to proceed without proper protective gear.',
    'Proper safety equipment should be provided immediately and management should receive training on safety protocols.',
    true,
    false
  ),
  (
    'CLM-2025-002',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000102'::uuid,
    false,
    'wage_dispute',
    'investigation',
    'medium',
    '2025-11-05',
    'HR Office - Main Building',
    'My overtime hours from October were not calculated correctly on my paycheck. Missing 8 hours of time-and-a-half pay.',
    'Request review of time records and payment of missing overtime wages plus any applicable penalties.',
    false,
    false
  ),
  (
    'CLM-2025-003',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'grievance_schedule',
    'submitted',
    'low',
    '2025-11-12',
    'Department Office',
    'Schedule was changed with less than 24 hours notice, violating our CBA which requires 48 hours notice.',
    'Request schedule change be reverted and acknowledgment of proper notice requirements going forward.',
    true,
    true
  ),
  (
    'CLM-2025-004',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000102'::uuid,
    true,
    'harassment_workplace',
    'assigned',
    'critical',
    '2025-11-08',
    'Break Room - 2nd Floor',
    'Experiencing ongoing verbal harassment from supervisor including inappropriate comments about personal appearance.',
    'Request immediate intervention, formal investigation, and implementation of anti-harassment training.',
    true,
    false
  ),
  (
    'CLM-2025-005',
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'grievance_discipline',
    'resolved',
    'medium',
    '2025-10-28',
    'Supervisor Office',
    'Received written warning without proper representation present, violating Weingarten rights.',
    'Request warning be removed from file and acknowledgment of representation rights.',
    false,
    false
  )
ON CONFLICT (claim_number) DO NOTHING;
