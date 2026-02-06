-- ============================================================================
-- Migration: 027_test_claims_data.sql
-- Purpose: Create test claims data for manual testing
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: Create Test Claims for Union Local 123
-- ============================================================================

INSERT INTO public.claims (
  tenant_id,
  claim_number,
  member_id,
  claim_type,
  status,
  incident_date,
  location,
  description,
  desired_outcome,
  assigned_to,
  priority
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'CLM-2024-TEST-001',
  '00000000-0000-0000-0000-000000000102', -- Jane Doe
  'workplace_safety',
  'under_review',
  '2024-01-10',
  'Factory Floor - Building A',
  'Test claim for manual testing of tenant isolation in Union Local 123. This claim involves a workplace safety issue.',
  'Proper safety protocols to be implemented',
  '00000000-0000-0000-0000-000000000103', -- Mike Wilson
  'medium'
), (
  'a1111111-1111-1111-1111-111111111111',
  'CLM-2024-TEST-002',
  '00000000-0000-0000-0000-000000000102', -- Jane Doe
  'wage_dispute',
  'investigation',
  '2024-01-15',
  'Payroll Office',
  'Another test claim for Union Local 123 to verify data isolation. Wage discrepancy reported.',
  'Back pay for hours worked',
  '00000000-0000-0000-0000-000000000103', -- Mike Wilson
  'high'
);

-- ============================================================================
-- Part 2: Create Test Claims for Workers Alliance
-- ============================================================================

INSERT INTO public.claims (
  tenant_id,
  claim_number,
  member_id,
  claim_type,
  status,
  incident_date,
  location,
  description,
  desired_outcome,
  assigned_to,
  priority
) VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'CLM-2024-TEST-003',
  '00000000-0000-0000-0000-000000000102', -- Jane Doe
  'harassment_workplace',
  'under_review',
  '2024-01-20',
  'Office Area - 3rd Floor',
  'Test claim for Workers Alliance tenant. Workplace harassment reported.',
  'Investigation and remediation',
  '00000000-0000-0000-0000-000000000103', -- Mike Wilson
  'high'
), (
  'b2222222-2222-2222-2222-222222222222',
  'CLM-2024-TEST-004',
  '00000000-0000-0000-0000-000000000102', -- Jane Doe
  'discrimination_gender',
  'assigned',
  '2024-01-25',
  'Management Office',
  'Another test claim for Workers Alliance to verify RLS policies. Gender discrimination in promotions.',
  'Fair promotion consideration',
  '00000000-0000-0000-0000-000000000103', -- Mike Wilson
  'critical'
);

-- ============================================================================
-- Part 3: Verification
-- ============================================================================

-- Verify claims created
SELECT 
  tenant_id,
  claim_number,
  claim_type,
  status,
  LEFT(description, 50) as description_preview
FROM public.claims
WHERE claim_number LIKE 'CLM-2024-TEST-%'
ORDER BY claim_number;

COMMIT;

-- ============================================================================
-- Success Message
-- ============================================================================
SELECT 
  'Test Claims Created!' as status,
  COUNT(*) as claims_created
FROM public.claims
WHERE claim_number LIKE 'CLM-2024-TEST-%';
