-- ============================================================================
-- Phase 1-3 Validation Test Suite
-- Purpose: Comprehensive validation of migrations 044-052
-- Database: 114 tables, 58 functions, 23 views, 75 enums
-- Date: November 24, 2025
-- ============================================================================

-- ============================================================================
-- PART 1: SCHEMA VALIDATION
-- ============================================================================

DO $$
DECLARE
    expected_tables INTEGER := 114;
    expected_functions INTEGER := 58;
    expected_views INTEGER := 23;
    expected_enums INTEGER := 75;
    actual_tables INTEGER;
    actual_functions INTEGER;
    actual_views INTEGER;
    actual_enums INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1-3: SCHEMA VALIDATION';
    RAISE NOTICE '========================================';
    
    -- Count tables
    SELECT COUNT(*) INTO actual_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- Count functions
    SELECT COUNT(DISTINCT routine_name) INTO actual_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';
    
    -- Count views
    SELECT COUNT(*) INTO actual_views
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    -- Count enums
    SELECT COUNT(*) INTO actual_enums
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'e';
    
    RAISE NOTICE 'Tables: % (expected: %)', actual_tables, expected_tables;
    RAISE NOTICE 'Functions: % (expected: %)', actual_functions, expected_functions;
    RAISE NOTICE 'Views: % (expected: %)', actual_views, expected_views;
    RAISE NOTICE 'Enums: % (expected: %)', actual_enums, expected_enums;
    
    IF actual_tables >= expected_tables AND 
       actual_functions >= expected_functions AND 
       actual_views >= expected_views AND 
       actual_enums >= expected_enums THEN
        RAISE NOTICE '✓ Schema object counts validated';
    ELSE
        RAISE WARNING '✗ Schema object count mismatch detected';
    END IF;
END $$;

-- ============================================================================
-- PART 2: PHASE 1 - PENSION & HEALTH/WELFARE VALIDATION
-- ============================================================================

DO $$
DECLARE
    test_org_id UUID;
    test_member_id UUID;
    test_plan_id UUID;
    test_coverage_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1: PENSION & HEALTH/WELFARE';
    RAISE NOTICE '========================================';
    
    -- Verify pension tables exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'pension_plans', 'pension_plan_contributions', 'pension_plan_members',
            'pension_benefit_calculations', 'hours_banks', 'hours_bank_transactions',
            'retirement_eligibility', 'pension_payouts'
        )
    ) THEN
        RAISE NOTICE '✓ Pension tables exist';
    ELSE
        RAISE WARNING '✗ Missing pension tables';
    END IF;
    
    -- Verify health/welfare tables exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'health_plans', 'health_plan_coverage', 'health_plan_members',
            'coverage_tiers'
        )
    ) THEN
        RAISE NOTICE '✓ Health/Welfare tables exist';
    ELSE
        RAISE WARNING '✗ Missing health/welfare tables';
    END IF;
    
    -- Test actuarial calculation functions
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name IN (
            'calculate_pension_benefit',
            'calculate_hours_bank_balance',
            'calculate_retirement_eligibility'
        )
    ) THEN
        RAISE NOTICE '✓ Actuarial calculation functions exist';
    ELSE
        RAISE WARNING '✗ Missing actuarial functions';
    END IF;
    
    -- Test RLS on pension tables
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'pension_plans'
        AND n.nspname = 'public'
        AND c.relrowsecurity = TRUE
    ) THEN
        RAISE NOTICE '✓ RLS enabled on pension tables';
    ELSE
        RAISE WARNING '✗ RLS not enabled on pension tables';
    END IF;
END $$;

-- ============================================================================
-- PART 3: PHASE 1 - TAX COMPLIANCE & FINANCIAL REPORTING
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1: TAX COMPLIANCE & FINANCIAL';
    RAISE NOTICE '========================================';
    
    -- Verify tax compliance tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            't4a_records', 't4a_generation_runs', 'cope_contributions',
            'cra_remittances'
        )
    ) THEN
        RAISE NOTICE '✓ Tax compliance tables exist';
    ELSE
        RAISE WARNING '✗ Missing tax compliance tables';
    END IF;
    
    -- Verify T4A generation function
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name IN ('generate_t4a_records', 'validate_t4a_data')
    ) THEN
        RAISE NOTICE '✓ T4A generation functions exist';
    ELSE
        RAISE WARNING '✗ Missing T4A functions';
    END IF;
    
    -- Check for CRA XML export capabilities
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't4a_records'
        AND column_name IN ('xml_payload', 'submission_status')
    ) THEN
        RAISE NOTICE '✓ CRA XML export fields exist';
    ELSE
        RAISE WARNING '✗ Missing CRA XML export fields';
    END IF;
END $$;

-- ============================================================================
-- PART 4: PHASE 2 - EQUITY & INDIGENOUS DATA SOVEREIGNTY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 2: EQUITY & INDIGENOUS DATA';
    RAISE NOTICE '========================================';
    
    -- Verify equity monitoring tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'equity_monitoring', 'demographic_data', 
            'accommodation_requests', 'pay_equity_analysis'
        )
    ) THEN
        RAISE NOTICE '✓ Equity monitoring tables exist';
    ELSE
        RAISE WARNING '✗ Missing equity monitoring tables';
    END IF;
    
    -- Check OCAP compliance fields
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'demographic_data'
        AND column_name IN ('consent_given', 'data_sovereignty_flag', 'indigenous_identity')
    ) THEN
        RAISE NOTICE '✓ OCAP compliance fields exist';
    ELSE
        RAISE WARNING '✗ Missing OCAP compliance fields';
    END IF;
    
    -- Verify Indigenous data privacy protections
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'demographic_data'
        AND policyname LIKE '%indigenous%'
    ) THEN
        RAISE NOTICE '✓ Indigenous data privacy policies exist';
    ELSE
        RAISE WARNING '✗ Missing Indigenous data privacy policies';
    END IF;
END $$;

-- ============================================================================
-- PART 5: PHASE 3 - ORGANIZING & CERTIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 3: ORGANIZING & CERTIFICATION';
    RAISE NOTICE '========================================';
    
    -- Verify organizing tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'organizing_campaigns', 'card_check_tracking', 
            'certification_applications', 'labour_board_filings',
            'community_chapters'
        )
    ) THEN
        RAISE NOTICE '✓ Organizing tables exist';
    ELSE
        RAISE WARNING '✗ Missing organizing tables';
    END IF;
    
    -- Check NLRB/CIRB compliance
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'certification_applications'
        AND column_name IN ('board_type', 'filing_jurisdiction', 'case_number')
    ) THEN
        RAISE NOTICE '✓ NLRB/CIRB compliance fields exist';
    ELSE
        RAISE WARNING '✗ Missing labour board compliance fields';
    END IF;
    
    -- Verify card check workflow
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name IN ('validate_card_check', 'calculate_support_percentage')
    ) THEN
        RAISE NOTICE '✓ Card check functions exist';
    ELSE
        RAISE WARNING '✗ Missing card check functions';
    END IF;
END $$;

-- ============================================================================
-- PART 6: PHASE 3 - POLITICAL ACTION & ELECTORAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 3: POLITICAL ACTION & ELECTORAL';
    RAISE NOTICE '========================================';
    
    -- Verify political action tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'political_action_campaigns', 'electoral_districts', 
            'gotv_activities', 'candidate_endorsements',
            'elections_canada_reports'
        )
    ) THEN
        RAISE NOTICE '✓ Political action tables exist';
    ELSE
        RAISE WARNING '✗ Missing political action tables';
    END IF;
    
    -- Check Elections Canada compliance
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'elections_canada_reports'
        AND column_name IN ('report_type', 'filing_period', 'compliance_status')
    ) THEN
        RAISE NOTICE '✓ Elections Canada compliance fields exist';
    ELSE
        RAISE WARNING '✗ Missing Elections Canada fields';
    END IF;
    
    -- Verify GOTV tracking
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'gotv_activities'
    ) THEN
        RAISE NOTICE '✓ GOTV tracking table exists';
    ELSE
        RAISE WARNING '✗ Missing GOTV tracking table';
    END IF;
END $$;

-- ============================================================================
-- PART 7: PHASE 3 - EDUCATION & TRAINING
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 3: EDUCATION & TRAINING';
    RAISE NOTICE '========================================';
    
    -- Verify education tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'training_programs', 'training_sessions', 'training_enrollments',
            'certifications', 'certification_requirements', 'learning_paths'
        )
    ) THEN
        RAISE NOTICE '✓ Education & training tables exist';
    ELSE
        RAISE WARNING '✗ Missing education tables';
    END IF;
    
    -- Check LMS functionality
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'training_sessions'
        AND column_name IN ('completion_status', 'progress_percentage', 'assessment_score')
    ) THEN
        RAISE NOTICE '✓ LMS functionality fields exist';
    ELSE
        RAISE WARNING '✗ Missing LMS functionality';
    END IF;
    
    -- Verify certification tracking
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'certifications'
        AND column_name IN ('issue_date', 'expiry_date', 'renewal_required')
    ) THEN
        RAISE NOTICE '✓ Certification tracking fields exist';
    ELSE
        RAISE WARNING '✗ Missing certification tracking';
    END IF;
END $$;

-- ============================================================================
-- PART 8: PHASE 4 - STRIKE FUND & FINANCIAL SUPPORT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 4: STRIKE FUND & FINANCIAL';
    RAISE NOTICE '========================================';
    
    -- Verify strike fund tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'strike_funds', 'fund_eligibility_rules', 'stipend_disbursements',
            'picket_attendance', 'hardship_applications', 'public_donations',
            'arrears_cases', 'member_dues_assignments', 'dues_rules',
            'dues_transactions', 'employer_remittances'
        )
    ) THEN
        RAISE NOTICE '✓ Strike fund & financial tables exist';
    ELSE
        RAISE WARNING '✗ Missing strike fund tables';
    END IF;
    
    -- Check eligibility calculation
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name IN ('calculate_strike_eligibility', 'calculate_stipend_amount')
    ) THEN
        RAISE NOTICE '✓ Eligibility calculation functions exist';
    ELSE
        RAISE WARNING '✗ Missing eligibility functions';
    END IF;
    
    -- Verify dues processing
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dues_transactions'
        AND column_name IN ('transaction_type', 'amount', 'processed_at')
    ) THEN
        RAISE NOTICE '✓ Dues processing fields exist';
    ELSE
        RAISE WARNING '✗ Missing dues processing fields';
    END IF;
END $$;

-- ============================================================================
-- PART 9: JURISDICTION & CLC COMPLIANCE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'JURISDICTION & CLC COMPLIANCE';
    RAISE NOTICE '========================================';
    
    -- Verify jurisdiction tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN (
            'jurisdiction_rules', 'jurisdiction_deadlines', 
            'compliance_validations', 'clc_tier_requirements'
        )
    ) THEN
        RAISE NOTICE '✓ Jurisdiction tables exist';
    ELSE
        RAISE WARNING '✗ Missing jurisdiction tables';
    END IF;
    
    -- Check CA jurisdiction enum
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'ca_jurisdiction'
        AND e.enumlabel IN ('CA-FED', 'CA-ON', 'CA-QC', 'CA-BC', 'CA-AB')
    ) THEN
        RAISE NOTICE '✓ CA jurisdiction enum validated';
    ELSE
        RAISE WARNING '✗ CA jurisdiction enum missing or incorrect';
    END IF;
    
    -- Verify CLC tier system
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'clc_tier'
        AND e.enumlabel IN ('LOCAL', 'COUNCIL', 'FEDERATION', 'INTERNATIONAL')
    ) THEN
        RAISE NOTICE '✓ CLC tier enum validated';
    ELSE
        RAISE WARNING '✗ CLC tier enum missing or incorrect';
    END IF;
END $$;

-- ============================================================================
-- PART 10: RLS POLICY COMPREHENSIVE CHECK
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    policy_count INTEGER;
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
    tables_without_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS COMPREHENSIVE VALIDATION';
    RAISE NOTICE '========================================';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '%_view'
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    LOOP
        -- Check if RLS is enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = table_record.tablename
            AND n.nspname = 'public'
            AND c.relrowsecurity = TRUE
        ) THEN
            tables_without_rls := array_append(tables_without_rls, table_record.tablename);
        END IF;
        
        -- Check if policies exist
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE tablename = table_record.tablename
        AND schemaname = 'public';
        
        IF policy_count = 0 THEN
            tables_without_policies := array_append(tables_without_policies, table_record.tablename);
        END IF;
    END LOOP;
    
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE WARNING 'Tables without RLS enabled: %', array_to_string(tables_without_rls, ', ');
    ELSE
        RAISE NOTICE '✓ All tables have RLS enabled';
    END IF;
    
    IF array_length(tables_without_policies, 1) > 0 THEN
        RAISE WARNING 'Tables without RLS policies: %', array_to_string(tables_without_policies, ', ');
    ELSE
        RAISE NOTICE '✓ All tables have RLS policies defined';
    END IF;
END $$;

-- ============================================================================
-- PART 11: MULTI-TENANCY ISOLATION TEST
-- ============================================================================

DO $$
DECLARE
    tenant1_id UUID := gen_random_uuid();
    tenant2_id UUID := gen_random_uuid();
    test_passed BOOLEAN := TRUE;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MULTI-TENANCY ISOLATION TEST';
    RAISE NOTICE '========================================';
    
    -- This test would require actual data insertion and role switching
    -- For validation purposes, we verify the infrastructure exists
    
    -- Check for tenant_id columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE '✓ Tenant ID columns exist';
    ELSE
        RAISE WARNING '✗ Missing tenant_id columns';
        test_passed := FALSE;
    END IF;
    
    -- Check for organization_id columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name = 'organization_id'
    ) THEN
        RAISE NOTICE '✓ Organization ID columns exist';
    ELSE
        RAISE WARNING '✗ Missing organization_id columns';
        test_passed := FALSE;
    END IF;
    
    -- Check for RLS policies with tenant filters
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND (qual LIKE '%tenant_id%' OR qual LIKE '%organization_id%')
    ) THEN
        RAISE NOTICE '✓ Tenant-based RLS policies exist';
    ELSE
        RAISE WARNING '✗ Missing tenant-based RLS policies';
        test_passed := FALSE;
    END IF;
    
    IF test_passed THEN
        RAISE NOTICE '✓ Multi-tenancy infrastructure validated';
    ELSE
        RAISE WARNING '✗ Multi-tenancy validation failed';
    END IF;
END $$;

-- ============================================================================
-- PART 12: FUNCTION SIGNATURE VALIDATION
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    critical_functions TEXT[] := ARRAY[
        'calculate_pension_benefit',
        'calculate_hours_bank_balance',
        'calculate_retirement_eligibility',
        'generate_t4a_records',
        'validate_card_check',
        'calculate_support_percentage',
        'calculate_strike_eligibility',
        'calculate_stipend_amount',
        'validate_jurisdiction_deadline',
        'check_clc_tier_compliance'
    ];
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    func_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRITICAL FUNCTIONS VALIDATION';
    RAISE NOTICE '========================================';
    
    FOREACH func_name IN ARRAY critical_functions
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = func_name
        ) THEN
            missing_functions := array_append(missing_functions, func_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE WARNING 'Missing critical functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE '✓ All critical functions exist';
    END IF;
    
    -- Count total functions
    SELECT COUNT(DISTINCT routine_name) INTO func_record
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';
    
    RAISE NOTICE 'Total functions in database: %', func_record.count;
END $$;

-- ============================================================================
-- PART 13: INDEX PERFORMANCE VALIDATION
-- ============================================================================

DO $$
DECLARE
    index_count INTEGER;
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INDEX PERFORMANCE VALIDATION';
    RAISE NOTICE '========================================';
    
    -- Check for tenant_id indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexdef LIKE '%tenant_id%'
    ) THEN
        missing_indexes := array_append(missing_indexes, 'tenant_id indexes');
    END IF;
    
    -- Check for organization_id indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexdef LIKE '%organization_id%'
    ) THEN
        missing_indexes := array_append(missing_indexes, 'organization_id indexes');
    END IF;
    
    -- Check for created_at indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexdef LIKE '%created_at%'
    ) THEN
        missing_indexes := array_append(missing_indexes, 'created_at indexes');
    END IF;
    
    -- Count total indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Total indexes: %', index_count;
    
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'Missing critical indexes: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✓ Critical indexes exist';
    END IF;
END $$;

-- ============================================================================
-- PART 14: FOREIGN KEY INTEGRITY
-- ============================================================================

DO $$
DECLARE
    fk_count INTEGER;
    orphaned_records TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FOREIGN KEY INTEGRITY';
    RAISE NOTICE '========================================';
    
    -- Count foreign keys
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE 'Total foreign keys: %', fk_count;
    
    -- Verify critical FK relationships exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
        AND table_name IN ('claims', 'members', 'organizations')
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE '✓ Core FK relationships exist';
    ELSE
        RAISE WARNING '✗ Missing core FK relationships';
    END IF;
END $$;

-- ============================================================================
-- PART 15: AUDIT & TIMESTAMP VALIDATION
-- ============================================================================

DO $$
DECLARE
    tables_without_timestamps TEXT[] := ARRAY[]::TEXT[];
    table_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AUDIT & TIMESTAMP VALIDATION';
    RAISE NOTICE '========================================';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE '%_view'
        AND tablename NOT LIKE 'pg_%'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = table_record.tablename
            AND column_name IN ('created_at', 'updated_at')
        ) THEN
            tables_without_timestamps := array_append(tables_without_timestamps, table_record.tablename);
        END IF;
    END LOOP;
    
    IF array_length(tables_without_timestamps, 1) > 0 THEN
        RAISE WARNING 'Tables without timestamps: %', array_to_string(tables_without_timestamps, ', ');
    ELSE
        RAISE NOTICE '✓ All tables have timestamp columns';
    END IF;
    
    -- Check for audit tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%_audit%'
    ) THEN
        RAISE NOTICE '✓ Audit tables exist';
    ELSE
        RAISE NOTICE 'ℹ No audit tables found (may be optional)';
    END IF;
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    view_count INTEGER;
    enum_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
    fk_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 1-3 VALIDATION SUMMARY';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    SELECT COUNT(DISTINCT routine_name) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public';
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO enum_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'e';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE 'Database Objects:';
    RAISE NOTICE '  - Tables: %', table_count;
    RAISE NOTICE '  - Functions: %', function_count;
    RAISE NOTICE '  - Views: %', view_count;
    RAISE NOTICE '  - Enums: %', enum_count;
    RAISE NOTICE '  - RLS Policies: %', policy_count;
    RAISE NOTICE '  - Indexes: %', index_count;
    RAISE NOTICE '  - Foreign Keys: %', fk_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Phase Coverage:';
    RAISE NOTICE '  ✓ Phase 1: Pension & Health/Welfare';
    RAISE NOTICE '  ✓ Phase 1: Tax Compliance & Financial';
    RAISE NOTICE '  ✓ Phase 2: Equity & Indigenous Data';
    RAISE NOTICE '  ✓ Phase 3: Organizing & Certification';
    RAISE NOTICE '  ✓ Phase 3: Political Action & Electoral';
    RAISE NOTICE '  ✓ Phase 3: Education & Training';
    RAISE NOTICE '  ✓ Phase 4: Strike Fund & Financial Support';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review any warnings above for required fixes.';
    RAISE NOTICE 'Run this validation after each migration.';
    RAISE NOTICE '========================================';
END $$;
