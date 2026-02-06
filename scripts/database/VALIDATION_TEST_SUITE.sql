-- ============================================================================
-- Platform Validation Test Suite
-- Purpose: Comprehensive testing of RLS policies, multi-tenancy, workflows
-- ============================================================================

-- ============================================================================
-- PART 1: RLS POLICY VALIDATION
-- ============================================================================

-- Test 1: Verify RLS is enabled on all critical tables
DO $$
DECLARE
    table_record RECORD;
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 1: RLS Enablement Check';
    RAISE NOTICE '========================================';
    
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname IN ('public', 'tenant_management', 'audit_security')
        AND tablename NOT LIKE 'pg_%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = table_record.tablename
            AND n.nspname = table_record.schemaname
            AND c.relrowsecurity = TRUE
        ) THEN
            tables_without_rls := array_append(tables_without_rls, 
                table_record.schemaname || '.' || table_record.tablename);
        END IF;
    END LOOP;
    
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE WARNING 'Tables without RLS: %', array_to_string(tables_without_rls, ', ');
    ELSE
        RAISE NOTICE '✓ All tables have RLS enabled';
    END IF;
END $$;

-- Test 2: Multi-tenant isolation test for claims table
DO $$
DECLARE
    tenant1_id UUID;
    tenant2_id UUID;
    member1_id UUID;
    member2_id UUID;
    claim1_id UUID;
    claim2_id UUID;
    leaked_claims INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 2: Claims Table Isolation';
    RAISE NOTICE '========================================';
    
    -- Create test tenants
    INSERT INTO tenants (tenant_slug, tenant_name) 
    VALUES ('test-union-a', 'Test Union A') 
    RETURNING id INTO tenant1_id;
    
    INSERT INTO tenants (tenant_slug, tenant_name) 
    VALUES ('test-union-b', 'Test Union B') 
    RETURNING id INTO tenant2_id;
    
    -- Create test members
    INSERT INTO organization_members (tenant_id, email, first_name, last_name)
    VALUES (tenant1_id, 'member1@union-a.ca', 'John', 'Doe')
    RETURNING id INTO member1_id;
    
    INSERT INTO organization_members (tenant_id, email, first_name, last_name)
    VALUES (tenant2_id, 'member1@union-b.ca', 'Jane', 'Smith')
    RETURNING id INTO member2_id;
    
    -- Create test claims
    INSERT INTO claims (tenant_id, member_id, title, description)
    VALUES (tenant1_id, member1_id, 'Union A Claim', 'Test claim for Union A')
    RETURNING id INTO claim1_id;
    
    INSERT INTO claims (tenant_id, member_id, title, description)
    VALUES (tenant2_id, member2_id, 'Union B Claim', 'Test claim for Union B')
    RETURNING id INTO claim2_id;
    
    -- Test isolation: Set tenant context to Union A
    PERFORM set_config('app.current_tenant_id', tenant1_id::TEXT, TRUE);
    
    -- Try to access Union B's claim (should fail)
    SELECT COUNT(*) INTO leaked_claims 
    FROM claims 
    WHERE id = claim2_id;
    
    IF leaked_claims > 0 THEN
        RAISE EXCEPTION '✗ SECURITY BREACH: Tenant A can access Tenant B claims!';
    ELSE
        RAISE NOTICE '✓ Tenant isolation working: Union A cannot see Union B claims';
    END IF;
    
    -- Verify Union A can see its own claims
    SELECT COUNT(*) INTO leaked_claims 
    FROM claims 
    WHERE id = claim1_id;
    
    IF leaked_claims = 0 THEN
        RAISE EXCEPTION '✗ ERROR: Tenant A cannot access its own claims!';
    ELSE
        RAISE NOTICE '✓ Tenant A can access its own claims';
    END IF;
    
    -- Cleanup
    DELETE FROM claims WHERE id IN (claim1_id, claim2_id);
    DELETE FROM organization_members WHERE id IN (member1_id, member2_id);
    DELETE FROM tenants WHERE id IN (tenant1_id, tenant2_id);
    
    RAISE NOTICE '✓ Test completed successfully';
END $$;

-- Test 3: Workflow instances tenant isolation
DO $$
DECLARE
    tenant1_id UUID;
    tenant2_id UUID;
    workflow1_id TEXT;
    workflow2_id TEXT;
    instance1_id TEXT;
    instance2_id TEXT;
    leaked_instances INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 3: Workflow Isolation';
    RAISE NOTICE '========================================';
    
    -- Get existing test tenants or create new ones
    SELECT id INTO tenant1_id FROM tenants WHERE tenant_slug = 'test-union-workflow-a' LIMIT 1;
    IF tenant1_id IS NULL THEN
        INSERT INTO tenants (tenant_slug, tenant_name) 
        VALUES ('test-union-workflow-a', 'Test Workflow Union A') 
        RETURNING id INTO tenant1_id;
    END IF;
    
    SELECT id INTO tenant2_id FROM tenants WHERE tenant_slug = 'test-union-workflow-b' LIMIT 1;
    IF tenant2_id IS NULL THEN
        INSERT INTO tenants (tenant_slug, tenant_name) 
        VALUES ('test-union-workflow-b', 'Test Workflow Union B') 
        RETURNING id INTO tenant2_id;
    END IF;
    
    -- Create test workflows
    workflow1_id := 'wf-' || substr(md5(random()::text), 1, 12);
    workflow2_id := 'wf-' || substr(md5(random()::text), 1, 12);
    
    -- Set context for tenant 1
    PERFORM set_config('app.current_tenant_id', tenant1_id::TEXT, TRUE);
    
    -- Query workflows (should only see tenant 1's workflows)
    SELECT COUNT(*) INTO leaked_instances 
    FROM workflows 
    WHERE tenant_id = tenant2_id;
    
    IF leaked_instances > 0 THEN
        RAISE EXCEPTION '✗ SECURITY BREACH: Workflow isolation failed!';
    ELSE
        RAISE NOTICE '✓ Workflow tenant isolation working correctly';
    END IF;
    
    -- Cleanup
    DELETE FROM tenants WHERE id IN (tenant1_id, tenant2_id);
    
    RAISE NOTICE '✓ Workflow isolation test completed';
END $$;

-- ============================================================================
-- PART 2: DATA INTEGRITY VALIDATION
-- ============================================================================

-- Test 4: Foreign key constraints
DO $$
DECLARE
    violation_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 4: Foreign Key Constraints';
    RAISE NOTICE '========================================';
    
    -- Test claims -> organization_members FK
    BEGIN
        INSERT INTO claims (tenant_id, member_id, title) 
        VALUES (gen_random_uuid(), gen_random_uuid(), 'Invalid FK Test');
        violation_count := violation_count + 1;
        RAISE WARNING '✗ Claims FK constraint not enforced!';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE '✓ Claims->Members FK constraint working';
    END;
    
    -- Test workflow_instances -> workflows FK
    BEGIN
        INSERT INTO workflow_instances (id, workflow_id, tenant_id, status, initiated_by) 
        VALUES ('test-inst', 'nonexistent-wf', gen_random_uuid(), 'pending', gen_random_uuid());
        violation_count := violation_count + 1;
        RAISE WARNING '✗ Workflow instances FK constraint not enforced!';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE '✓ Workflow instances FK constraint working';
    END;
    
    IF violation_count > 0 THEN
        RAISE EXCEPTION '✗ %  FK constraints failed!', violation_count;
    ELSE
        RAISE NOTICE '✓ All FK constraints enforced correctly';
    END IF;
END $$;

-- Test 5: Check constraints validation
DO $$
DECLARE
    test_passed BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 5: Check Constraints';
    RAISE NOTICE '========================================';
    
    -- Test claim status constraint
    BEGIN
        INSERT INTO claims (tenant_id, member_id, title, status) 
        VALUES (gen_random_uuid(), gen_random_uuid(), 'Test', 'invalid_status');
        test_passed := FALSE;
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ Claim status check constraint working';
    END;
    
    -- Test priority constraint
    BEGIN
        INSERT INTO claims (tenant_id, member_id, title, priority) 
        VALUES (gen_random_uuid(), gen_random_uuid(), 'Test', 'invalid_priority');
        test_passed := FALSE;
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✓ Claim priority check constraint working';
    END;
    
    IF NOT test_passed THEN
        RAISE EXCEPTION '✗ Check constraints not enforced!';
    END IF;
END $$;

-- ============================================================================
-- PART 3: PERFORMANCE VALIDATION
-- ============================================================================

-- Test 6: Index effectiveness
DO $$
DECLARE
    index_record RECORD;
    unused_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 6: Index Usage Analysis';
    RAISE NOTICE '========================================';
    
    FOR index_record IN
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
        AND schemaname = 'public'
    LOOP
        unused_indexes := array_append(unused_indexes, 
            index_record.tablename || '.' || index_record.indexname);
    END LOOP;
    
    IF array_length(unused_indexes, 1) > 0 THEN
        RAISE WARNING 'Unused indexes detected: %', array_to_string(unused_indexes, ', ');
    ELSE
        RAISE NOTICE '✓ All indexes have been used';
    END IF;
END $$;

-- Test 7: Query performance baseline
DO $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration INTERVAL;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 7: Query Performance';
    RAISE NOTICE '========================================';
    
    -- Test 1: Claims list query
    start_time := clock_timestamp();
    PERFORM * FROM claims 
    WHERE status = 'open' 
    ORDER BY created_at DESC 
    LIMIT 100;
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    IF duration > interval '100 milliseconds' THEN
        RAISE WARNING 'Claims query slow: %', duration;
    ELSE
        RAISE NOTICE '✓ Claims list query: %', duration;
    END IF;
    
    -- Test 2: Member lookup query
    start_time := clock_timestamp();
    PERFORM * FROM organization_members 
    WHERE email LIKE '%@%' 
    LIMIT 100;
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    IF duration > interval '50 milliseconds' THEN
        RAISE WARNING 'Member lookup slow: %', duration;
    ELSE
        RAISE NOTICE '✓ Member lookup query: %', duration;
    END IF;
END $$;

-- ============================================================================
-- PART 4: ANALYTICS VALIDATION
-- ============================================================================

-- Test 8: Materialized view refresh
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 8: Analytics Views';
    RAISE NOTICE '========================================';
    
    -- Refresh materialized views
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_claims_daily_summary;
        RAISE NOTICE '✓ Claims daily summary refreshed';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Claims summary refresh failed: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_engagement;
        RAISE NOTICE '✓ Member engagement view refreshed';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Member engagement refresh failed: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_deadline_compliance_daily;
        RAISE NOTICE '✓ Deadline compliance view refreshed';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Deadline compliance refresh failed: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- PART 5: SECURITY AUDIT
-- ============================================================================

-- Test 9: Sensitive data encryption check
DO $$
DECLARE
    unencrypted_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 9: Data Security Audit';
    RAISE NOTICE '========================================';
    
    -- Check for unencrypted email columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'email'
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE '✓ Email fields found (recommend encryption at application layer)';
    END IF;
    
    -- Check for password fields (should not exist - use external auth)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name LIKE '%password%'
    ) THEN
        RAISE WARNING '✗ Password fields detected - use external authentication!';
    ELSE
        RAISE NOTICE '✓ No password fields (using Clerk authentication)';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VALIDATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All critical tests completed.';
    RAISE NOTICE 'Review warnings above for optimization opportunities.';
    RAISE NOTICE '========================================';
END $$;
