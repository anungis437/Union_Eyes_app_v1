-- Migration 062: Enable RLS on Reports System
-- Priority: HIGH
-- Impact: Protects financial reports and analytics from unauthorized cross-tenant access
-- Tables: reports, report_templates, report_executions, report_shares, scheduled_reports

-- ============================================
-- 1. REPORTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see reports in their tenant or public reports
CREATE POLICY reports_select_tenant ON reports
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id()::text
        OR is_public = true
    );

-- Policy: Users can create reports in their tenant
CREATE POLICY reports_insert_own ON reports
    FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id()::text
        AND created_by::text = get_current_user_id()
    );

-- Policy: Users can update their own reports
CREATE POLICY reports_update_own ON reports
    FOR UPDATE
    USING (
        tenant_id = get_current_tenant_id()::text
        AND created_by::text = get_current_user_id()
    );

-- Policy: Users can delete their own reports
CREATE POLICY reports_delete_own ON reports
    FOR DELETE
    USING (
        tenant_id = get_current_tenant_id()::text
        AND created_by::text = get_current_user_id()
    );

-- ============================================
-- 2. REPORT_TEMPLATES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see public templates or templates in their tenant
CREATE POLICY report_templates_select_access ON report_templates
    FOR SELECT
    USING (
        is_public = true
        OR tenant_id = get_current_tenant_id()::text
    );

-- Policy: Users can create templates in their tenant
CREATE POLICY report_templates_insert_own ON report_templates
    FOR INSERT
    WITH CHECK (
        tenant_id = get_current_tenant_id()::text
        AND created_by::text = get_current_user_id()
    );

-- Policy: Creators can update their templates
CREATE POLICY report_templates_update_creator ON report_templates
    FOR UPDATE
    USING (
        tenant_id = get_current_tenant_id()::text
        AND created_by::text = get_current_user_id()
    );

-- Policy: Creators can delete their templates
CREATE POLICY report_templates_delete_creator ON report_templates
    FOR DELETE
    USING (
        tenant_id = get_current_tenant_id()::text
        AND created_by::text = get_current_user_id()
    );

-- ============================================
-- 3. REPORT_EXECUTIONS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE report_executions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see executions in their tenant
CREATE POLICY report_executions_select_tenant ON report_executions
    FOR SELECT
    USING (
        report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Users can create executions for reports they can access
CREATE POLICY report_executions_insert_own ON report_executions
    FOR INSERT
    WITH CHECK (
        executed_by::text = get_current_user_id()
        AND report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Users can delete their own executions
CREATE POLICY report_executions_delete_own ON report_executions
    FOR DELETE
    USING (
        executed_by::text = get_current_user_id()
        AND report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- ============================================
-- 4. REPORT_SHARES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see shares where they are participant
CREATE POLICY report_shares_select_participant ON report_shares
    FOR SELECT
    USING (
        shared_by::text = get_current_user_id()
        OR shared_with_user::text = get_current_user_id()
        OR report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Users can create shares for reports they can access
CREATE POLICY report_shares_insert_own ON report_shares
    FOR INSERT
    WITH CHECK (
        shared_by::text = get_current_user_id()
        AND report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Sharers can update their shares
CREATE POLICY report_shares_update_sharer ON report_shares
    FOR UPDATE
    USING (shared_by::text = get_current_user_id());

-- Policy: Sharers can revoke their shares
CREATE POLICY report_shares_delete_sharer ON report_shares
    FOR DELETE
    USING (shared_by::text = get_current_user_id());

-- ============================================
-- 5. SCHEDULED_REPORTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see scheduled reports in their tenant
CREATE POLICY scheduled_reports_select_tenant ON scheduled_reports
    FOR SELECT
    USING (
        report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Users can create scheduled reports for reports they can access
CREATE POLICY scheduled_reports_insert_own ON scheduled_reports
    FOR INSERT
    WITH CHECK (
        created_by::text = get_current_user_id()
        AND report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Creators can update their scheduled reports
CREATE POLICY scheduled_reports_update_creator ON scheduled_reports
    FOR UPDATE
    USING (
        created_by::text = get_current_user_id()
        AND report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );

-- Policy: Creators can delete their scheduled reports
CREATE POLICY scheduled_reports_delete_creator ON scheduled_reports
    FOR DELETE
    USING (
        created_by::text = get_current_user_id()
        AND report_id IN (
            SELECT id 
            FROM reports 
            WHERE tenant_id = get_current_tenant_id()::text
        )
    );
