-- ============================================================================
-- Test RLS Policies
-- ============================================================================

-- Test 1: Union Local 123 should only see their 2 claims
BEGIN;
SELECT set_current_tenant('a1111111-1111-1111-1111-111111111111');
SELECT 
  claim_number, 
  claim_type,
  status
FROM claims 
WHERE claim_number LIKE 'CLM-2024-TEST-%'
ORDER BY claim_number;
COMMIT;

-- Test 2: Workers Alliance should only see their 2 claims
BEGIN;
SELECT set_current_tenant('b2222222-2222-2222-2222-222222222222');
SELECT 
  claim_number, 
  claim_type,
  status
FROM claims 
WHERE claim_number LIKE 'CLM-2024-TEST-%'
ORDER BY claim_number;
COMMIT;

-- Test 3: Without setting tenant, should see no claims (RLS blocks all)
BEGIN;
-- Reset tenant context
SELECT set_current_setting('app.current_tenant_id', '', false);
SELECT 
  claim_number, 
  claim_type,
  status
FROM claims 
WHERE claim_number LIKE 'CLM-2024-TEST-%'
ORDER BY claim_number;
COMMIT;
