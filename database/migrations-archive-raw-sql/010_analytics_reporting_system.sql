-- Migration 010: Analytics & Reporting System
-- Created: November 14, 2025
-- Purpose: Comprehensive analytics and reporting infrastructure for enterprise-level insights

-- ============================================================================
-- PART 1: Core Tables for Reports and Scheduling
-- ============================================================================

-- Reports table: Store custom reports and dashboards
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('dashboard', 'custom', 'template', 'scheduled')),
    category VARCHAR(100) CHECK (category IN ('executive', 'operational', 'compliance', 'financial', 'member', 'deadline', 'performance')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Report configuration (fields, filters, chart types)
    template_id UUID REFERENCES reports(id) ON DELETE SET NULL, -- Link to template if created from one
    is_public BOOLEAN DEFAULT false, -- Shared with all users in tenant
    is_template BOOLEAN DEFAULT false, -- Available as template for others
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    CONSTRAINT reports_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_is_template ON reports(is_template) WHERE is_template = true;
CREATE INDEX idx_reports_config ON reports USING gin(config);

-- Report schedules: Automated report generation
CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom')),
    schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Cron expression, day of week/month, time
    delivery_method VARCHAR(50) NOT NULL CHECK (delivery_method IN ('email', 'dashboard', 'storage', 'webhook')),
    recipients JSONB DEFAULT '[]'::jsonb, -- Array of email addresses or user IDs
    export_format VARCHAR(20) CHECK (export_format IN ('pdf', 'excel', 'csv', 'json')),
    is_active BOOLEAN DEFAULT true,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(50) CHECK (last_run_status IN ('success', 'failed', 'pending')),
    run_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_tenant ON report_schedules(tenant_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX idx_report_schedules_active ON report_schedules(is_active);

-- Export jobs: Track report export requests and status
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv', 'json')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_name VARCHAR(500),
    file_url TEXT, -- S3/Azure Blob Storage URL
    file_size_bytes BIGINT,
    row_count INTEGER,
    error_message TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_duration_ms INTEGER,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Auto-cleanup after 7 days
);

CREATE INDEX idx_export_jobs_tenant ON export_jobs(tenant_id);
CREATE INDEX idx_export_jobs_report ON export_jobs(report_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_created_by ON export_jobs(created_by);
CREATE INDEX idx_export_jobs_expires_at ON export_jobs(expires_at);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at DESC);

-- ============================================================================
-- PART 2: Materialized Views for Fast Analytics
-- ============================================================================

-- Materialized View 1: Daily Claims Summary
-- Used for: Trend charts, executive dashboard, claims volume tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_claims_daily_summary AS
SELECT 
    c.tenant_id,
    DATE(c.created_at) AS report_date,
    COUNT(*) AS total_claims,
    COUNT(*) FILTER (WHERE c.status = 'open') AS open_claims,
    COUNT(*) FILTER (WHERE c.status = 'in_progress') AS in_progress_claims,
    COUNT(*) FILTER (WHERE c.status = 'resolved') AS resolved_claims,
    COUNT(*) FILTER (WHERE c.status = 'denied') AS denied_claims,
    COUNT(*) FILTER (WHERE c.status = 'closed') AS closed_claims,
    COUNT(DISTINCT c.assigned_to) AS active_stewards,
    COUNT(DISTINCT c.member_id) AS active_members,
    -- Claim types
    COUNT(*) FILTER (WHERE c.claim_type = 'grievance') AS grievance_claims,
    COUNT(*) FILTER (WHERE c.claim_type = 'arbitration') AS arbitration_claims,
    COUNT(*) FILTER (WHERE c.claim_type = 'complaint') AS complaint_claims,
    COUNT(*) FILTER (WHERE c.claim_type = 'appeal') AS appeal_claims,
    -- Priority distribution
    COUNT(*) FILTER (WHERE c.priority = 'critical') AS critical_priority,
    COUNT(*) FILTER (WHERE c.priority = 'high') AS high_priority,
    COUNT(*) FILTER (WHERE c.priority = 'medium') AS medium_priority,
    COUNT(*) FILTER (WHERE c.priority = 'low') AS low_priority,
    -- Resolution metrics
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
    MIN(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS min_resolution_days,
    MAX(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS max_resolution_days,
    -- Age metrics
    AVG(EXTRACT(EPOCH FROM (NOW() - c.created_at))/86400.0) FILTER (WHERE c.status NOT IN ('resolved', 'denied', 'closed')) AS avg_open_age_days,
    MAX(EXTRACT(EPOCH FROM (NOW() - c.created_at))/86400.0) FILTER (WHERE c.status NOT IN ('resolved', 'denied', 'closed')) AS max_open_age_days
FROM claims c
GROUP BY c.tenant_id, DATE(c.created_at);

CREATE UNIQUE INDEX idx_mv_claims_daily_summary_pk ON mv_claims_daily_summary(tenant_id, report_date);
CREATE INDEX idx_mv_claims_daily_summary_date ON mv_claims_daily_summary(report_date DESC);

-- Materialized View 2: Member Engagement Metrics
-- Used for: Member analytics, engagement reports, retention analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_member_engagement AS
SELECT 
    om.tenant_id,
    om.id AS member_id,
    om.first_name,
    om.last_name,
    om.email,
    om.role,
    om.status AS member_status,
    om.created_at AS member_since,
    -- Claims statistics
    COUNT(c.id) AS total_claims,
    COUNT(c.id) FILTER (WHERE c.status = 'open') AS open_claims,
    COUNT(c.id) FILTER (WHERE c.status = 'in_progress') AS in_progress_claims,
    COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved_claims,
    COUNT(c.id) FILTER (WHERE c.status = 'denied') AS denied_claims,
    -- Resolution metrics
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
    COUNT(c.id) FILTER (WHERE c.resolved_at IS NOT NULL AND c.created_at > NOW() - INTERVAL '30 days') AS resolved_last_30_days,
    COUNT(c.id) FILTER (WHERE c.resolved_at IS NOT NULL AND c.created_at > NOW() - INTERVAL '90 days') AS resolved_last_90_days,
    -- Engagement metrics
    MAX(c.created_at) AS last_claim_date,
    EXTRACT(EPOCH FROM (NOW() - MAX(c.created_at)))/86400.0 AS days_since_last_claim,
    COUNT(c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '30 days') AS claims_last_30_days,
    COUNT(c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '90 days') AS claims_last_90_days,
    COUNT(c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '365 days') AS claims_last_year,
    -- Outcome metrics
    COUNT(c.id) FILTER (WHERE c.outcome = 'won') AS claims_won,
    COUNT(c.id) FILTER (WHERE c.outcome = 'lost') AS claims_lost,
    COUNT(c.id) FILTER (WHERE c.outcome = 'settled') AS claims_settled,
    CASE 
        WHEN COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL) > 0 
        THEN ROUND(100.0 * COUNT(c.id) FILTER (WHERE c.outcome = 'won') / COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL), 1)
        ELSE NULL 
    END AS win_rate_percentage,
    -- Engagement score (0-100)
    CASE 
        WHEN COUNT(c.id) = 0 THEN 0
        WHEN MAX(c.created_at) < NOW() - INTERVAL '180 days' THEN 25
        WHEN MAX(c.created_at) < NOW() - INTERVAL '90 days' THEN 50
        WHEN MAX(c.created_at) < NOW() - INTERVAL '30 days' THEN 75
        ELSE 100
    END AS engagement_score
FROM organization_members om
LEFT JOIN claims c ON c.member_id = om.id AND c.tenant_id = om.tenant_id
GROUP BY om.tenant_id, om.id, om.first_name, om.last_name, om.email, om.role, om.status, om.created_at;

CREATE UNIQUE INDEX idx_mv_member_engagement_pk ON mv_member_engagement(tenant_id, member_id);
CREATE INDEX idx_mv_member_engagement_score ON mv_member_engagement(engagement_score DESC);
CREATE INDEX idx_mv_member_engagement_last_claim ON mv_member_engagement(last_claim_date DESC NULLS LAST);

-- Materialized View 3: Deadline Compliance Metrics
-- Used for: Compliance dashboard, deadline reports, SLA tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_deadline_compliance_daily AS
SELECT 
    cd.tenant_id,
    DATE(cd.created_at) AS report_date,
    COUNT(*) AS total_deadlines,
    COUNT(*) FILTER (WHERE cd.status = 'pending') AS pending_deadlines,
    COUNT(*) FILTER (WHERE cd.status = 'completed') AS completed_deadlines,
    COUNT(*) FILTER (WHERE cd.status = 'overdue') AS overdue_deadlines,
    COUNT(*) FILTER (WHERE cd.status = 'waived') AS waived_deadlines,
    -- Compliance rates
    ROUND(100.0 * COUNT(*) FILTER (WHERE cd.status = 'completed' AND cd.completed_at <= cd.current_deadline) / 
          NULLIF(COUNT(*) FILTER (WHERE cd.status IN ('completed', 'overdue')), 0), 1) AS on_time_percentage,
    ROUND(100.0 * COUNT(*) FILTER (WHERE cd.status = 'overdue') / 
          NULLIF(COUNT(*), 0), 1) AS overdue_percentage,
    -- Days overdue statistics
    AVG(cd.days_overdue) FILTER (WHERE cd.status = 'overdue') AS avg_days_overdue,
    MAX(cd.days_overdue) FILTER (WHERE cd.status = 'overdue') AS max_days_overdue,
    COUNT(*) FILTER (WHERE cd.status = 'overdue' AND cd.days_overdue > 7) AS critical_overdue_count,
    -- Priority breakdown
    COUNT(*) FILTER (WHERE cd.priority = 'critical') AS critical_priority,
    COUNT(*) FILTER (WHERE cd.priority = 'high') AS high_priority,
    COUNT(*) FILTER (WHERE cd.priority = 'medium') AS medium_priority,
    COUNT(*) FILTER (WHERE cd.priority = 'low') AS low_priority,
    -- Extension metrics
    COUNT(de.id) AS total_extensions,
    COUNT(de.id) FILTER (WHERE de.status = 'approved') AS approved_extensions,
    COUNT(de.id) FILTER (WHERE de.status = 'denied') AS denied_extensions,
    AVG(de.days_requested) FILTER (WHERE de.status = 'approved') AS avg_extension_days,
    ROUND(100.0 * COUNT(de.id) FILTER (WHERE de.status = 'approved') / 
          NULLIF(COUNT(de.id), 0), 1) AS extension_approval_rate
FROM claim_deadlines cd
LEFT JOIN deadline_extensions de ON de.deadline_id = cd.id
GROUP BY cd.tenant_id, DATE(cd.created_at);

CREATE UNIQUE INDEX idx_mv_deadline_compliance_daily_pk ON mv_deadline_compliance_daily(tenant_id, report_date);
CREATE INDEX idx_mv_deadline_compliance_daily_date ON mv_deadline_compliance_daily(report_date DESC);

-- Materialized View 4: Financial Summary
-- Used for: Financial dashboard, budget reports, cost analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_financial_summary_daily AS
SELECT 
    c.tenant_id,
    DATE(c.created_at) AS report_date,
    -- Claim values
    COUNT(*) AS total_claims,
    SUM(COALESCE((c.metadata->>'claim_value')::numeric, 0)) AS total_claim_value,
    AVG(COALESCE((c.metadata->>'claim_value')::numeric, 0)) AS avg_claim_value,
    MAX(COALESCE((c.metadata->>'claim_value')::numeric, 0)) AS max_claim_value,
    -- Settlement amounts
    COUNT(*) FILTER (WHERE c.outcome = 'settled') AS settled_claims,
    SUM(COALESCE((c.metadata->>'settlement_amount')::numeric, 0)) FILTER (WHERE c.outcome = 'settled') AS total_settlements,
    AVG(COALESCE((c.metadata->>'settlement_amount')::numeric, 0)) FILTER (WHERE c.outcome = 'settled') AS avg_settlement,
    -- Legal costs
    SUM(COALESCE((c.metadata->>'legal_costs')::numeric, 0)) AS total_legal_costs,
    AVG(COALESCE((c.metadata->>'legal_costs')::numeric, 0)) AS avg_legal_costs,
    -- Cost per claim
    CASE 
        WHEN COUNT(*) > 0 
        THEN SUM(COALESCE((c.metadata->>'legal_costs')::numeric, 0)) / COUNT(*)
        ELSE 0 
    END AS cost_per_claim,
    -- Recovery rate (settlements vs claim values)
    CASE 
        WHEN SUM(COALESCE((c.metadata->>'claim_value')::numeric, 0)) > 0 
        THEN ROUND(100.0 * SUM(COALESCE((c.metadata->>'settlement_amount')::numeric, 0)) / 
             SUM(COALESCE((c.metadata->>'claim_value')::numeric, 0)), 1)
        ELSE NULL 
    END AS recovery_rate_percentage,
    -- Outcome distribution
    COUNT(*) FILTER (WHERE c.outcome = 'won') AS won_claims,
    COUNT(*) FILTER (WHERE c.outcome = 'lost') AS lost_claims,
    COUNT(*) FILTER (WHERE c.outcome = 'settled') AS settled_outcome_claims,
    SUM(COALESCE((c.metadata->>'claim_value')::numeric, 0)) FILTER (WHERE c.outcome = 'won') AS won_claim_value,
    SUM(COALESCE((c.metadata->>'settlement_amount')::numeric, 0)) FILTER (WHERE c.outcome = 'settled') AS settled_amount
FROM claims c
GROUP BY c.tenant_id, DATE(c.created_at);

CREATE UNIQUE INDEX idx_mv_financial_summary_daily_pk ON mv_financial_summary_daily(tenant_id, report_date);
CREATE INDEX idx_mv_financial_summary_daily_date ON mv_financial_summary_daily(report_date DESC);

-- Materialized View 5: Steward Performance Metrics
-- Used for: Performance management, workload balancing, steward analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_steward_performance AS
SELECT 
    om.tenant_id,
    om.id AS steward_id,
    om.first_name,
    om.last_name,
    om.email,
    om.status AS steward_status,
    -- Caseload metrics
    COUNT(c.id) AS total_caseload,
    COUNT(c.id) FILTER (WHERE c.status = 'open') AS open_cases,
    COUNT(c.id) FILTER (WHERE c.status = 'in_progress') AS in_progress_cases,
    COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved_cases,
    COUNT(c.id) FILTER (WHERE c.status = 'denied') AS denied_cases,
    -- Recent activity
    COUNT(c.id) FILTER (WHERE c.created_at > NOW() - INTERVAL '30 days') AS new_cases_30_days,
    COUNT(c.id) FILTER (WHERE c.resolved_at > NOW() - INTERVAL '30 days') AS resolved_30_days,
    MAX(c.created_at) AS last_case_assigned,
    MAX(c.resolved_at) AS last_case_resolved,
    -- Performance metrics
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) 
        FILTER (WHERE c.resolved_at IS NOT NULL) AS median_resolution_days,
    MIN(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS fastest_resolution_days,
    MAX(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS slowest_resolution_days,
    -- Outcome metrics
    COUNT(c.id) FILTER (WHERE c.outcome = 'won') AS cases_won,
    COUNT(c.id) FILTER (WHERE c.outcome = 'lost') AS cases_lost,
    COUNT(c.id) FILTER (WHERE c.outcome = 'settled') AS cases_settled,
    CASE 
        WHEN COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL) > 0 
        THEN ROUND(100.0 * COUNT(c.id) FILTER (WHERE c.outcome = 'won') / COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL), 1)
        ELSE NULL 
    END AS win_rate_percentage,
    -- Member satisfaction (placeholder for future survey integration)
    NULL::numeric AS satisfaction_score,
    -- Performance score (composite metric: resolution speed + win rate + caseload)
    CASE 
        WHEN COUNT(c.id) = 0 THEN 0
        ELSE ROUND(
            (
                -- Speed score (faster = higher, capped at 100)
                LEAST(100, 100 - COALESCE(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL), 100)) * 0.4 +
                -- Win rate score
                COALESCE(100.0 * COUNT(c.id) FILTER (WHERE c.outcome = 'won') / NULLIF(COUNT(c.id) FILTER (WHERE c.outcome IS NOT NULL), 0), 0) * 0.4 +
                -- Activity score (recent resolutions)
                LEAST(100, COUNT(c.id) FILTER (WHERE c.resolved_at > NOW() - INTERVAL '30 days') * 5) * 0.2
            ), 1
        )
    END AS performance_score
FROM organization_members om
LEFT JOIN claims c ON c.assigned_to = om.id AND c.tenant_id = om.tenant_id
WHERE om.role IN ('steward', 'officer', 'admin')
GROUP BY om.tenant_id, om.id, om.first_name, om.last_name, om.email, om.status;

CREATE UNIQUE INDEX idx_mv_steward_performance_pk ON mv_steward_performance(tenant_id, steward_id);
CREATE INDEX idx_mv_steward_performance_score ON mv_steward_performance(performance_score DESC NULLS LAST);
CREATE INDEX idx_mv_steward_performance_caseload ON mv_steward_performance(total_caseload DESC);

-- Materialized View 6: Claim Type Distribution
-- Used for: Pie charts, distribution reports, claim type analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_claim_type_distribution AS
SELECT 
    c.tenant_id,
    DATE_TRUNC('month', c.created_at) AS month,
    c.claim_type,
    c.priority,
    c.status,
    COUNT(*) AS claim_count,
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
    COUNT(*) FILTER (WHERE c.outcome = 'won') AS won_count,
    COUNT(*) FILTER (WHERE c.outcome = 'lost') AS lost_count,
    COUNT(*) FILTER (WHERE c.outcome = 'settled') AS settled_count,
    SUM(COALESCE((c.metadata->>'claim_value')::numeric, 0)) AS total_value
FROM claims c
GROUP BY c.tenant_id, DATE_TRUNC('month', c.created_at), c.claim_type, c.priority, c.status;

CREATE INDEX idx_mv_claim_type_distribution_tenant ON mv_claim_type_distribution(tenant_id);
CREATE INDEX idx_mv_claim_type_distribution_month ON mv_claim_type_distribution(month DESC);
CREATE INDEX idx_mv_claim_type_distribution_type ON mv_claim_type_distribution(claim_type);

-- Materialized View 7: Monthly Trends
-- Used for: Month-over-month comparisons, trend analysis, executive reports
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_trends AS
SELECT 
    c.tenant_id,
    DATE_TRUNC('month', c.created_at) AS month,
    COUNT(*) AS total_claims,
    COUNT(*) FILTER (WHERE c.status = 'resolved') AS resolved_claims,
    COUNT(*) FILTER (WHERE c.status = 'denied') AS denied_claims,
    COUNT(DISTINCT c.member_id) AS unique_members,
    COUNT(DISTINCT c.assigned_to) AS active_stewards,
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
    -- Financial metrics
    SUM(COALESCE((c.metadata->>'claim_value')::numeric, 0)) AS total_claim_value,
    SUM(COALESCE((c.metadata->>'settlement_amount')::numeric, 0)) AS total_settlements,
    SUM(COALESCE((c.metadata->>'legal_costs')::numeric, 0)) AS total_legal_costs,
    -- Outcome metrics
    COUNT(*) FILTER (WHERE c.outcome = 'won') AS won_claims,
    COUNT(*) FILTER (WHERE c.outcome = 'lost') AS lost_claims,
    COUNT(*) FILTER (WHERE c.outcome = 'settled') AS settled_claims,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c.outcome = 'won') / NULLIF(COUNT(*) FILTER (WHERE c.outcome IS NOT NULL), 0), 1) AS win_rate_percentage,
    -- Growth metrics (calculated in application layer by comparing to previous month)
    LAG(COUNT(*)) OVER (PARTITION BY c.tenant_id ORDER BY DATE_TRUNC('month', c.created_at)) AS prev_month_claims,
    ROUND(100.0 * (COUNT(*) - LAG(COUNT(*)) OVER (PARTITION BY c.tenant_id ORDER BY DATE_TRUNC('month', c.created_at))) / 
          NULLIF(LAG(COUNT(*)) OVER (PARTITION BY c.tenant_id ORDER BY DATE_TRUNC('month', c.created_at)), 0), 1) AS month_over_month_growth
FROM claims c
GROUP BY c.tenant_id, DATE_TRUNC('month', c.created_at);

CREATE UNIQUE INDEX idx_mv_monthly_trends_pk ON mv_monthly_trends(tenant_id, month);
CREATE INDEX idx_mv_monthly_trends_month ON mv_monthly_trends(month DESC);

-- Materialized View 8: Weekly Activity Patterns
-- Used for: Heatmaps, seasonality analysis, workload patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_activity AS
SELECT 
    c.tenant_id,
    EXTRACT(ISODOW FROM c.created_at) AS day_of_week, -- 1=Monday, 7=Sunday
    EXTRACT(HOUR FROM c.created_at) AS hour_of_day,
    COUNT(*) AS claim_count,
    AVG(COUNT(*)) OVER (PARTITION BY c.tenant_id) AS avg_claims_per_hour,
    -- Relative activity score (0-100)
    ROUND(100.0 * COUNT(*) / MAX(COUNT(*)) OVER (PARTITION BY c.tenant_id), 1) AS activity_score
FROM claims c
GROUP BY c.tenant_id, EXTRACT(ISODOW FROM c.created_at), EXTRACT(HOUR FROM c.created_at);

CREATE INDEX idx_mv_weekly_activity_tenant ON mv_weekly_activity(tenant_id);
CREATE INDEX idx_mv_weekly_activity_day ON mv_weekly_activity(day_of_week);
CREATE INDEX idx_mv_weekly_activity_hour ON mv_weekly_activity(hour_of_day);

-- Materialized View 9: Resolution Metrics by Claim Type
-- Used for: Performance metrics, SLA reporting, type-specific analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_resolution_metrics AS
SELECT 
    c.tenant_id,
    c.claim_type,
    c.priority,
    COUNT(*) AS total_claims,
    COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL) AS resolved_claims,
    -- Resolution time statistics
    AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS avg_resolution_days,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) 
        FILTER (WHERE c.resolved_at IS NOT NULL) AS median_resolution_days,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) 
        FILTER (WHERE c.resolved_at IS NOT NULL) AS p90_resolution_days,
    MIN(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS min_resolution_days,
    MAX(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0) FILTER (WHERE c.resolved_at IS NOT NULL) AS max_resolution_days,
    -- SLA compliance (assuming 30 days for standard, 14 for high, 7 for critical)
    COUNT(*) FILTER (
        WHERE c.resolved_at IS NOT NULL AND 
        EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0 <= 
            CASE c.priority 
                WHEN 'critical' THEN 7 
                WHEN 'high' THEN 14 
                ELSE 30 
            END
    ) AS sla_met_count,
    ROUND(100.0 * 
        COUNT(*) FILTER (
            WHERE c.resolved_at IS NOT NULL AND 
            EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/86400.0 <= 
                CASE c.priority 
                    WHEN 'critical' THEN 7 
                    WHEN 'high' THEN 14 
                    ELSE 30 
                END
        ) / NULLIF(COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL), 0), 1
    ) AS sla_compliance_percentage
FROM claims c
GROUP BY c.tenant_id, c.claim_type, c.priority;

CREATE UNIQUE INDEX idx_mv_resolution_metrics_pk ON mv_resolution_metrics(tenant_id, claim_type, priority);
CREATE INDEX idx_mv_resolution_metrics_type ON mv_resolution_metrics(claim_type);

-- Materialized View 10: Member Cohorts
-- Used for: Retention analysis, growth metrics, cohort reports
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_member_cohorts AS
SELECT 
    om.tenant_id,
    DATE_TRUNC('month', om.created_at) AS cohort_month,
    COUNT(*) AS cohort_size,
    COUNT(*) FILTER (WHERE om.status = 'active') AS active_members,
    COUNT(*) FILTER (WHERE om.status = 'inactive') AS inactive_members,
    ROUND(100.0 * COUNT(*) FILTER (WHERE om.status = 'active') / NULLIF(COUNT(*), 0), 1) AS retention_rate,
    -- Claims filed by cohort
    COUNT(c.id) AS total_claims_filed,
    AVG(c_count.claim_count) AS avg_claims_per_member,
    -- Engagement metrics
    COUNT(*) FILTER (WHERE c_recent.has_recent_activity = true) AS active_last_90_days,
    ROUND(100.0 * COUNT(*) FILTER (WHERE c_recent.has_recent_activity = true) / NULLIF(COUNT(*), 0), 1) AS active_percentage
FROM organization_members om
LEFT JOIN claims c ON c.member_id = om.id AND c.tenant_id = om.tenant_id
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS claim_count
    FROM claims
    WHERE member_id = om.id AND tenant_id = om.tenant_id
) c_count ON true
LEFT JOIN LATERAL (
    SELECT EXISTS(
        SELECT 1 FROM claims
        WHERE member_id = om.id AND tenant_id = om.tenant_id
        AND created_at > NOW() - INTERVAL '90 days'
    ) AS has_recent_activity
) c_recent ON true
GROUP BY om.tenant_id, DATE_TRUNC('month', om.created_at);

CREATE UNIQUE INDEX idx_mv_member_cohorts_pk ON mv_member_cohorts(tenant_id, cohort_month);
CREATE INDEX idx_mv_member_cohorts_month ON mv_member_cohorts(cohort_month DESC);

-- ============================================================================
-- PART 3: Functions for Materialized View Refresh
-- ============================================================================

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS TABLE(view_name TEXT, refresh_status TEXT, duration_ms INTEGER) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    -- Refresh mv_claims_daily_summary
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_claims_daily_summary;
    end_time := clock_timestamp();
    view_name := 'mv_claims_daily_summary';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_member_engagement
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_engagement;
    end_time := clock_timestamp();
    view_name := 'mv_member_engagement';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_deadline_compliance_daily
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_deadline_compliance_daily;
    end_time := clock_timestamp();
    view_name := 'mv_deadline_compliance_daily';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_financial_summary_daily
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_financial_summary_daily;
    end_time := clock_timestamp();
    view_name := 'mv_financial_summary_daily';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_steward_performance
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_steward_performance;
    end_time := clock_timestamp();
    view_name := 'mv_steward_performance';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_claim_type_distribution
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_claim_type_distribution;
    end_time := clock_timestamp();
    view_name := 'mv_claim_type_distribution';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_monthly_trends
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_trends;
    end_time := clock_timestamp();
    view_name := 'mv_monthly_trends';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_weekly_activity
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_activity;
    end_time := clock_timestamp();
    view_name := 'mv_weekly_activity';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_resolution_metrics
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resolution_metrics;
    end_time := clock_timestamp();
    view_name := 'mv_resolution_metrics';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    -- Refresh mv_member_cohorts
    start_time := clock_timestamp();
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_member_cohorts;
    end_time := clock_timestamp();
    view_name := 'mv_member_cohorts';
    refresh_status := 'success';
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    RETURN NEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: Triggers for Auto-updating Reports
-- ============================================================================

-- Trigger to update updated_at timestamp on reports
CREATE OR REPLACE FUNCTION update_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at_trigger
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_report_updated_at();

-- Trigger to update updated_at timestamp on report_schedules
CREATE TRIGGER report_schedules_updated_at_trigger
    BEFORE UPDATE ON report_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_report_updated_at();

-- ============================================================================
-- PART 5: Initial Data and Comments
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE reports IS 'Custom reports and dashboards created by users';
COMMENT ON TABLE report_schedules IS 'Automated report generation schedules';
COMMENT ON TABLE export_jobs IS 'Export job tracking for PDF, Excel, CSV generation';

COMMENT ON MATERIALIZED VIEW mv_claims_daily_summary IS 'Daily aggregated claims metrics for trend analysis';
COMMENT ON MATERIALIZED VIEW mv_member_engagement IS 'Member engagement and activity metrics';
COMMENT ON MATERIALIZED VIEW mv_deadline_compliance_daily IS 'Daily deadline compliance and extension metrics';
COMMENT ON MATERIALIZED VIEW mv_financial_summary_daily IS 'Daily financial metrics including claim values and settlements';
COMMENT ON MATERIALIZED VIEW mv_steward_performance IS 'Steward performance and caseload metrics';
COMMENT ON MATERIALIZED VIEW mv_claim_type_distribution IS 'Distribution of claims by type, priority, and status';
COMMENT ON MATERIALIZED VIEW mv_monthly_trends IS 'Monthly aggregated metrics for trend analysis';
COMMENT ON MATERIALIZED VIEW mv_weekly_activity IS 'Weekly activity patterns for heatmap visualization';
COMMENT ON MATERIALIZED VIEW mv_resolution_metrics IS 'Resolution time metrics by claim type and priority';
COMMENT ON MATERIALIZED VIEW mv_member_cohorts IS 'Member cohort analysis for retention tracking';

-- Migration complete
-- Run refresh_analytics_views() after migration to populate all materialized views
-- Schedule this function to run hourly for continuous updates
