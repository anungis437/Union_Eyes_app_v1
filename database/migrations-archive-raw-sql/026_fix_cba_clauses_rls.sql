-- ============================================================================
-- Migration: 026_fix_cba_clauses_rls.sql
-- Purpose: Fix RLS policies for cba_clauses table using JOIN pattern
-- Issue: cba_clauses doesn't have tenant_id column - uses relationship 
--        through collective_agreements table
-- ============================================================================

BEGIN;

-- ============================================================================
-- Part 1: Drop Non-Functional Policies
-- ============================================================================

DROP POLICY IF EXISTS cba_clauses_tenant_isolation_select ON public.cba_clauses;
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_insert ON public.cba_clauses;
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_update ON public.cba_clauses;
DROP POLICY IF EXISTS cba_clauses_tenant_isolation_delete ON public.cba_clauses;

-- ============================================================================
-- Part 2: Create Correct Policies Using EXISTS + JOIN Pattern
-- ============================================================================

-- SELECT Policy: Users can only see clauses from their tenant's CBAs
CREATE POLICY cba_clauses_tenant_isolation_select ON public.cba_clauses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.collective_agreements
      WHERE collective_agreements.id = cba_clauses.cba_id
      AND collective_agreements.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- INSERT Policy: Users can only insert clauses for their tenant's CBAs
CREATE POLICY cba_clauses_tenant_isolation_insert ON public.cba_clauses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.collective_agreements
      WHERE collective_agreements.id = cba_clauses.cba_id
      AND collective_agreements.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- UPDATE Policy: Users can only update clauses from their tenant's CBAs
CREATE POLICY cba_clauses_tenant_isolation_update ON public.cba_clauses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.collective_agreements
      WHERE collective_agreements.id = cba_clauses.cba_id
      AND collective_agreements.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.collective_agreements
      WHERE collective_agreements.id = cba_clauses.cba_id
      AND collective_agreements.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- DELETE Policy: Users can only delete clauses from their tenant's CBAs
CREATE POLICY cba_clauses_tenant_isolation_delete ON public.cba_clauses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.collective_agreements
      WHERE collective_agreements.id = cba_clauses.cba_id
      AND collective_agreements.tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ============================================================================
-- Part 3: Verification
-- ============================================================================

-- Verify all policies created successfully
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'cba_clauses'
ORDER BY policyname;

COMMIT;

-- ============================================================================
-- Success Message
-- ============================================================================
SELECT 'cba_clauses RLS Policies Fixed! All policies now use JOIN pattern through collective_agreements.' as status;
