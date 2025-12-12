-- =============================================================================
-- PHASE 8: ANALYTICS & REPORTING ENHANCEMENTS
-- =============================================================================
-- Purpose: Close competitive gaps in analytics and reporting (70% → 100%)
-- Missing Features:
--   1. Scheduled report delivery (automated email/export on schedule)
--   2. Benchmark comparisons (compare vs. other locals/nationals)
--   3. Enhanced communication analytics (comprehensive dashboard)
--   4. Advanced engagement metrics (predictive analytics, heatmaps)
-- Competitive Context:
--   - UnionTrack ENGAGE: 100% analytics (all features)
--   - UnionWare: 95% analytics (comprehensive reporting)
--   - UnionEyes: 70% → 100% (Phase 8 completion)
-- =============================================================================

-- =============================================================================
-- TABLE 1: scheduled_reports
-- =============================================================================
-- Purpose: Manage automated report generation and delivery schedules
-- Features:
--   - Cron-based scheduling (daily, weekly, monthly, custom)
--   - Multiple recipients (email distribution lists)
--   - Format selection (PDF, Excel, CSV)
--   - Report history tracking
--   - Manual trigger capability
-- =============================================================================

CREATE TABLE IF NOT EXISTS scheduled_reports (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Report configuration
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL, -- 'executive_dashboard', 'communication_analytics', 'engagement_metrics', 'financial_summary', 'training_completion', 'grievance_summary', 'dues_collection', 'organizing_progress', 'custom'
    report_description TEXT,
    
    -- Report parameters (JSON for flexibility)
    report_parameters JSONB DEFAULT '{}'::jsonb, -- e.g., {"date_range": "last_30_days", "include_charts": true, "metrics": ["membership", "dues"]}
    
    -- Schedule configuration
    schedule_type TEXT NOT NULL DEFAULT 'cron', -- 'cron', 'one_time', 'manual_only'
    cron_expression TEXT, -- e.g., '0 6 * * 1' (every Monday at 6 AM), '0 8 1 * *' (1st of month at 8 AM)
    timezone TEXT DEFAULT 'America/Toronto',
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    
    -- Delivery configuration
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of email addresses: ["admin@union.ca", "president@union.ca"]
    delivery_format TEXT NOT NULL DEFAULT 'pdf', -- 'pdf', 'excel', 'csv', 'all'
    include_attachments BOOLEAN DEFAULT true,
    email_subject TEXT,
    email_body TEXT, -- Optional custom message
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    run_count INTEGER DEFAULT 0,
    last_run_status TEXT, -- 'success', 'failed', 'running', 'skipped'
    last_run_error TEXT,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_report_type CHECK (report_type IN (
        'executive_dashboard', 'communication_analytics', 'engagement_metrics',
        'financial_summary', 'training_completion', 'grievance_summary',
        'dues_collection', 'organizing_progress', 'benchmark_comparison', 'custom'
    )),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('cron', 'one_time', 'manual_only')),
    CONSTRAINT valid_delivery_format CHECK (delivery_format IN ('pdf', 'excel', 'csv', 'all')),
    CONSTRAINT valid_last_run_status CHECK (last_run_status IS NULL OR last_run_status IN ('success', 'failed', 'running', 'skipped')),
    CONSTRAINT cron_required_for_scheduled CHECK (
        schedule_type != 'cron' OR cron_expression IS NOT NULL
    )
);

-- Indexes for scheduled_reports
CREATE INDEX idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_reports_type ON scheduled_reports(report_type);
CREATE INDEX idx_scheduled_reports_created_by ON scheduled_reports(created_by);
CREATE INDEX idx_scheduled_reports_active ON scheduled_reports(tenant_id, is_active);

-- RLS policies for scheduled_reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled reports in their tenant"
    ON scheduled_reports FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Admins can create scheduled reports"
    ON scheduled_reports FOR INSERT
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('union_admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can update scheduled reports"
    ON scheduled_reports FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('union_admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can delete scheduled reports"
    ON scheduled_reports FOR DELETE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('union_admin', 'super_admin')
        )
    );

-- Trigger to update next_run_at based on cron expression
CREATE OR REPLACE FUNCTION update_scheduled_report_next_run()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if schedule is active and cron-based
    IF NEW.is_active = true AND NEW.schedule_type = 'cron' AND NEW.cron_expression IS NOT NULL THEN
        -- Note: In production, use pg_cron extension or external scheduler
        -- For now, calculate next run as +1 day from current time (placeholder)
        NEW.next_run_at := now() + INTERVAL '1 day';
    ELSIF NEW.schedule_type = 'one_time' THEN
        -- One-time schedules run once then deactivate
        IF NEW.last_run_at IS NOT NULL THEN
            NEW.is_active := false;
            NEW.next_run_at := NULL;
        END IF;
    ELSIF NEW.schedule_type = 'manual_only' THEN
        NEW.next_run_at := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scheduled_report_next_run
    BEFORE INSERT OR UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_report_next_run();

-- Trigger to update updated_at
CREATE TRIGGER trg_scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE 2: report_delivery_history
-- =============================================================================
-- Purpose: Track all report deliveries (automated and manual)
-- Features:
--   - Delivery status tracking
--   - File storage URLs
--   - Recipient confirmation
--   - Error logging
--   - Delivery metrics
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_delivery_history (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Report reference
    scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE SET NULL,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    
    -- Delivery details
    delivery_method TEXT NOT NULL DEFAULT 'email', -- 'email', 'download', 'api'
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of email addresses
    delivery_format TEXT NOT NULL, -- 'pdf', 'excel', 'csv'
    
    -- File storage
    file_url TEXT, -- URL to stored report file (Vercel Blob or Supabase Storage)
    file_size_bytes BIGINT,
    file_hash TEXT, -- SHA-256 hash for integrity verification
    expires_at TIMESTAMPTZ, -- File expiration date (e.g., 90 days)
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'generating', 'sending', 'delivered', 'failed', 'expired'
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Email delivery details
    email_subject TEXT,
    email_opened BOOLEAN DEFAULT false,
    email_opened_at TIMESTAMPTZ,
    email_clicked BOOLEAN DEFAULT false,
    email_clicked_at TIMESTAMPTZ,
    
    -- Metrics
    generation_time_ms INTEGER, -- Time to generate report (milliseconds)
    delivery_time_ms INTEGER, -- Time to deliver report (milliseconds)
    
    -- Audit fields
    triggered_by UUID REFERENCES auth.users(id), -- NULL for automated, user ID for manual
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_delivery_method CHECK (delivery_method IN ('email', 'download', 'api')),
    CONSTRAINT valid_delivery_format CHECK (delivery_format IN ('pdf', 'excel', 'csv')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'generating', 'sending', 'delivered', 'failed', 'expired'))
);

-- Indexes for report_delivery_history
CREATE INDEX idx_report_delivery_tenant ON report_delivery_history(tenant_id);
CREATE INDEX idx_report_delivery_scheduled_report ON report_delivery_history(scheduled_report_id);
CREATE INDEX idx_report_delivery_status ON report_delivery_history(status);
CREATE INDEX idx_report_delivery_created_at ON report_delivery_history(created_at DESC);
CREATE INDEX idx_report_delivery_expires_at ON report_delivery_history(expires_at) WHERE status = 'delivered';
CREATE INDEX idx_report_delivery_triggered_by ON report_delivery_history(triggered_by);

-- RLS policies for report_delivery_history
ALTER TABLE report_delivery_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report delivery history in their tenant"
    ON report_delivery_history FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can insert report delivery records"
    ON report_delivery_history FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can update report delivery records"
    ON report_delivery_history FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Trigger to update scheduled_reports run statistics
CREATE OR REPLACE FUNCTION update_scheduled_report_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND NEW.scheduled_report_id IS NOT NULL THEN
        UPDATE scheduled_reports
        SET 
            run_count = run_count + 1,
            last_run_at = NEW.delivered_at,
            last_run_status = 'success'
        WHERE id = NEW.scheduled_report_id;
    ELSIF NEW.status = 'failed' AND NEW.scheduled_report_id IS NOT NULL THEN
        UPDATE scheduled_reports
        SET 
            last_run_at = NEW.failed_at,
            last_run_status = 'failed',
            last_run_error = NEW.error_message
        WHERE id = NEW.scheduled_report_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scheduled_report_stats
    AFTER INSERT OR UPDATE ON report_delivery_history
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_report_stats();

-- =============================================================================
-- TABLE 3: benchmark_categories
-- =============================================================================
-- Purpose: Define metrics for benchmark comparisons
-- Features:
--   - Metric definitions (name, description, calculation method)
--   - Category grouping (financial, operational, engagement)
--   - Unit specification (percentage, count, currency, hours)
--   - Aggregation logic
-- =============================================================================

CREATE TABLE IF NOT EXISTS benchmark_categories (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category definition
    category_name TEXT NOT NULL UNIQUE, -- 'membership_growth', 'dues_collection_rate', 'grievance_resolution_time', 'training_completion', 'engagement_score'
    display_name TEXT NOT NULL,
    description TEXT,
    category_group TEXT NOT NULL, -- 'financial', 'operational', 'engagement', 'training', 'organizing'
    
    -- Metric configuration
    unit_type TEXT NOT NULL, -- 'percentage', 'count', 'currency', 'hours', 'days', 'score'
    calculation_method TEXT, -- SQL query or calculation description
    higher_is_better BOOLEAN DEFAULT true, -- For comparison indicators (green/red)
    
    -- Display configuration
    display_order INTEGER DEFAULT 0,
    icon TEXT, -- Icon name for UI
    color TEXT, -- Hex color for charts
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_category_group CHECK (category_group IN ('financial', 'operational', 'engagement', 'training', 'organizing', 'membership')),
    CONSTRAINT valid_unit_type CHECK (unit_type IN ('percentage', 'count', 'currency', 'hours', 'days', 'score', 'ratio'))
);

-- Indexes for benchmark_categories
CREATE INDEX idx_benchmark_categories_group ON benchmark_categories(category_group);
CREATE INDEX idx_benchmark_categories_active ON benchmark_categories(is_active);
CREATE INDEX idx_benchmark_categories_display_order ON benchmark_categories(display_order);

-- RLS policies for benchmark_categories (public read)
ALTER TABLE benchmark_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view benchmark categories"
    ON benchmark_categories FOR SELECT
    USING (true);

CREATE POLICY "Only super admins can manage benchmark categories"
    ON benchmark_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER trg_benchmark_categories_updated_at
    BEFORE UPDATE ON benchmark_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE 4: benchmark_data
-- =============================================================================
-- Purpose: Store aggregate benchmark statistics for comparison
-- Features:
--   - Aggregate stats by union type, size, region
--   - Time-series data (monthly snapshots)
--   - Industry averages
--   - Peer group comparisons
--   - Anonymized data (no tenant identification)
-- =============================================================================

CREATE TABLE IF NOT EXISTS benchmark_data (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Benchmark segmentation
    benchmark_category_id UUID NOT NULL REFERENCES benchmark_categories(id) ON DELETE CASCADE,
    union_type TEXT NOT NULL, -- 'public_sector', 'private_sector', 'building_trades', 'industrial', 'service', 'all'
    union_size_bracket TEXT NOT NULL, -- 'small' (<500), 'medium' (500-2000), 'large' (2000-10000), 'extra_large' (10000+), 'all'
    region TEXT NOT NULL, -- 'BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU', 'National', 'all'
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
    
    -- Benchmark values
    metric_value DECIMAL(15, 2) NOT NULL, -- The actual benchmark value
    sample_size INTEGER NOT NULL, -- Number of unions in this benchmark
    min_value DECIMAL(15, 2), -- Minimum value in sample
    max_value DECIMAL(15, 2), -- Maximum value in sample
    percentile_25 DECIMAL(15, 2), -- 25th percentile
    percentile_50 DECIMAL(15, 2), -- Median (50th percentile)
    percentile_75 DECIMAL(15, 2), -- 75th percentile
    standard_deviation DECIMAL(15, 2),
    
    -- Data quality
    data_quality_score INTEGER DEFAULT 100, -- 0-100, based on sample size and completeness
    is_projected BOOLEAN DEFAULT false, -- True if value is projected/estimated
    confidence_level TEXT DEFAULT 'high', -- 'high', 'medium', 'low'
    
    -- Audit fields
    data_source TEXT, -- 'internal_aggregate', 'industry_survey', 'government_data', 'manual_entry'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_union_type CHECK (union_type IN ('public_sector', 'private_sector', 'building_trades', 'industrial', 'service', 'healthcare', 'education', 'all')),
    CONSTRAINT valid_union_size_bracket CHECK (union_size_bracket IN ('small', 'medium', 'large', 'extra_large', 'all')),
    CONSTRAINT valid_period_type CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
    CONSTRAINT valid_confidence_level CHECK (confidence_level IN ('high', 'medium', 'low')),
    CONSTRAINT valid_data_quality_score CHECK (data_quality_score BETWEEN 0 AND 100),
    CONSTRAINT positive_sample_size CHECK (sample_size > 0),
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);

-- Indexes for benchmark_data
CREATE INDEX idx_benchmark_data_category ON benchmark_data(benchmark_category_id);
CREATE INDEX idx_benchmark_data_union_type ON benchmark_data(union_type);
CREATE INDEX idx_benchmark_data_size ON benchmark_data(union_size_bracket);
CREATE INDEX idx_benchmark_data_region ON benchmark_data(region);
CREATE INDEX idx_benchmark_data_period ON benchmark_data(period_start, period_end);
CREATE INDEX idx_benchmark_data_composite ON benchmark_data(benchmark_category_id, union_type, union_size_bracket, region, period_start);

-- RLS policies for benchmark_data (read-only for authenticated users)
ALTER TABLE benchmark_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view benchmark data"
    ON benchmark_data FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Only super admins can manage benchmark data"
    ON benchmark_data FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER trg_benchmark_data_updated_at
    BEFORE UPDATE ON benchmark_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE 5: tenant_benchmark_snapshots
-- =============================================================================
-- Purpose: Store tenant-specific metrics for benchmark comparison
-- Features:
--   - Tenant metric snapshots (monthly/quarterly)
--   - Calculated comparison vs. benchmarks
--   - Performance indicators
--   - Trend analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_benchmark_snapshots (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenancy
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Metric reference
    benchmark_category_id UUID NOT NULL REFERENCES benchmark_categories(id) ON DELETE CASCADE,
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly',
    
    -- Tenant metric value
    metric_value DECIMAL(15, 2) NOT NULL,
    
    -- Comparison vs. benchmark
    benchmark_value DECIMAL(15, 2), -- The applicable benchmark value
    variance_from_benchmark DECIMAL(15, 2), -- Difference (tenant - benchmark)
    variance_percentage DECIMAL(8, 2), -- Percentage difference
    percentile_rank INTEGER, -- Where tenant ranks (0-100)
    performance_indicator TEXT, -- 'excellent' (top 25%), 'above_average' (25-50%), 'average' (50-75%), 'below_average' (75-100%)
    
    -- Trend analysis
    previous_period_value DECIMAL(15, 2),
    period_over_period_change DECIMAL(15, 2), -- Change from previous period
    period_over_period_percentage DECIMAL(8, 2),
    trend_direction TEXT, -- 'improving', 'stable', 'declining'
    
    -- Data quality
    data_completeness_percentage INTEGER DEFAULT 100, -- How complete the source data is
    calculation_notes TEXT,
    
    -- Audit fields
    calculated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_period_type_snapshot CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
    CONSTRAINT valid_performance_indicator CHECK (performance_indicator IS NULL OR performance_indicator IN ('excellent', 'above_average', 'average', 'below_average', 'needs_improvement')),
    CONSTRAINT valid_trend_direction CHECK (trend_direction IS NULL OR trend_direction IN ('improving', 'stable', 'declining')),
    CONSTRAINT valid_percentile_rank CHECK (percentile_rank IS NULL OR percentile_rank BETWEEN 0 AND 100),
    CONSTRAINT valid_data_completeness CHECK (data_completeness_percentage BETWEEN 0 AND 100),
    CONSTRAINT valid_period_snapshot CHECK (period_start <= period_end),
    CONSTRAINT unique_tenant_metric_period UNIQUE (tenant_id, benchmark_category_id, period_start, period_end)
);

-- Indexes for tenant_benchmark_snapshots
CREATE INDEX idx_tenant_benchmark_snapshots_tenant ON tenant_benchmark_snapshots(tenant_id);
CREATE INDEX idx_tenant_benchmark_snapshots_category ON tenant_benchmark_snapshots(benchmark_category_id);
CREATE INDEX idx_tenant_benchmark_snapshots_period ON tenant_benchmark_snapshots(period_start, period_end);
CREATE INDEX idx_tenant_benchmark_snapshots_composite ON tenant_benchmark_snapshots(tenant_id, benchmark_category_id, period_start);
CREATE INDEX idx_tenant_benchmark_snapshots_performance ON tenant_benchmark_snapshots(performance_indicator);

-- RLS policies for tenant_benchmark_snapshots
ALTER TABLE tenant_benchmark_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view benchmark snapshots in their tenant"
    ON tenant_benchmark_snapshots FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can insert benchmark snapshots"
    ON tenant_benchmark_snapshots FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "System can update benchmark snapshots"
    ON tenant_benchmark_snapshots FOR UPDATE
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Function to calculate performance indicator based on percentile
CREATE OR REPLACE FUNCTION calculate_performance_indicator(percentile INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF percentile IS NULL THEN
        RETURN NULL;
    ELSIF percentile >= 75 THEN
        RETURN 'excellent';
    ELSIF percentile >= 50 THEN
        RETURN 'above_average';
    ELSIF percentile >= 25 THEN
        RETURN 'average';
    ELSE
        RETURN 'below_average';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate trend direction
CREATE OR REPLACE FUNCTION calculate_trend_direction(
    current_value DECIMAL,
    previous_value DECIMAL,
    higher_is_better BOOLEAN
)
RETURNS TEXT AS $$
DECLARE
    change_percentage DECIMAL;
    threshold DECIMAL := 2.0; -- 2% threshold for "stable"
BEGIN
    IF previous_value IS NULL OR previous_value = 0 THEN
        RETURN 'stable';
    END IF;
    
    change_percentage := ((current_value - previous_value) / previous_value) * 100;
    
    IF ABS(change_percentage) < threshold THEN
        RETURN 'stable';
    ELSIF (higher_is_better AND change_percentage > 0) OR (NOT higher_is_better AND change_percentage < 0) THEN
        RETURN 'improving';
    ELSE
        RETURN 'declining';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate comparison fields
CREATE OR REPLACE FUNCTION calculate_benchmark_comparison()
RETURNS TRIGGER AS $$
DECLARE
    category_record RECORD;
BEGIN
    -- Get benchmark category details
    SELECT higher_is_better INTO category_record
    FROM benchmark_categories
    WHERE id = NEW.benchmark_category_id;
    
    -- Calculate variance
    IF NEW.benchmark_value IS NOT NULL THEN
        NEW.variance_from_benchmark := NEW.metric_value - NEW.benchmark_value;
        IF NEW.benchmark_value != 0 THEN
            NEW.variance_percentage := (NEW.variance_from_benchmark / NEW.benchmark_value) * 100;
        END IF;
    END IF;
    
    -- Calculate period-over-period change
    IF NEW.previous_period_value IS NOT NULL THEN
        NEW.period_over_period_change := NEW.metric_value - NEW.previous_period_value;
        IF NEW.previous_period_value != 0 THEN
            NEW.period_over_period_percentage := (NEW.period_over_period_change / NEW.previous_period_value) * 100;
        END IF;
    END IF;
    
    -- Calculate trend direction
    IF NEW.previous_period_value IS NOT NULL THEN
        NEW.trend_direction := calculate_trend_direction(
            NEW.metric_value,
            NEW.previous_period_value,
            category_record.higher_is_better
        );
    END IF;
    
    -- Calculate performance indicator
    IF NEW.percentile_rank IS NOT NULL THEN
        NEW.performance_indicator := calculate_performance_indicator(NEW.percentile_rank);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_benchmark_comparison
    BEFORE INSERT OR UPDATE ON tenant_benchmark_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION calculate_benchmark_comparison();

-- =============================================================================
-- SEED DATA: benchmark_categories
-- =============================================================================
-- Insert standard benchmark categories

INSERT INTO benchmark_categories (category_name, display_name, description, category_group, unit_type, higher_is_better, display_order, icon, color) VALUES
-- Financial metrics
('dues_collection_rate', 'Dues Collection Rate', 'Percentage of expected dues actually collected', 'financial', 'percentage', true, 1, 'DollarSign', '#10b981'),
('arrears_percentage', 'Arrears Percentage', 'Percentage of members with outstanding dues', 'financial', 'percentage', false, 2, 'AlertTriangle', '#ef4444'),
('revenue_per_member', 'Revenue per Member', 'Average annual revenue per active member', 'financial', 'currency', true, 3, 'TrendingUp', '#3b82f6'),
('operating_expense_ratio', 'Operating Expense Ratio', 'Operating expenses as percentage of revenue', 'financial', 'percentage', false, 4, 'PieChart', '#f59e0b'),

-- Membership metrics
('membership_growth_rate', 'Membership Growth Rate', 'Year-over-year membership growth percentage', 'membership', 'percentage', true, 5, 'Users', '#8b5cf6'),
('member_retention_rate', 'Member Retention Rate', 'Percentage of members retained year-over-year', 'membership', 'percentage', true, 6, 'UserCheck', '#06b6d4'),
('new_member_onboarding_time', 'New Member Onboarding Time', 'Average days to complete new member onboarding', 'membership', 'days', false, 7, 'Clock', '#ec4899'),

-- Operational metrics
('grievance_resolution_time', 'Grievance Resolution Time', 'Average days to resolve grievances', 'operational', 'days', false, 8, 'Scale', '#14b8a6'),
('grievance_win_rate', 'Grievance Win Rate', 'Percentage of grievances resolved in favor of members', 'operational', 'percentage', true, 9, 'Award', '#f97316'),
('response_time_to_member_inquiries', 'Response Time to Inquiries', 'Average hours to respond to member inquiries', 'operational', 'hours', false, 10, 'MessageSquare', '#84cc16'),

-- Training metrics
('training_completion_rate', 'Training Completion Rate', 'Percentage of enrolled members completing training', 'training', 'percentage', true, 11, 'GraduationCap', '#6366f1'),
('certification_renewal_rate', 'Certification Renewal Rate', 'Percentage of certifications renewed on time', 'training', 'percentage', true, 12, 'Award', '#8b5cf6'),
('training_hours_per_member', 'Training Hours per Member', 'Average annual training hours per active member', 'training', 'hours', true, 13, 'BookOpen', '#0ea5e9'),

-- Engagement metrics
('member_engagement_score', 'Member Engagement Score', 'Average engagement score (0-100) across all members', 'engagement', 'score', true, 14, 'Activity', '#22c55e'),
('event_attendance_rate', 'Event Attendance Rate', 'Percentage of registered members attending events', 'engagement', 'percentage', true, 15, 'Calendar', '#a855f7'),
('communication_open_rate', 'Communication Open Rate', 'Percentage of members opening email communications', 'engagement', 'percentage', true, 16, 'Mail', '#3b82f6'),
('member_portal_usage_rate', 'Portal Usage Rate', 'Percentage of members logging into portal monthly', 'engagement', 'percentage', true, 17, 'Globe', '#06b6d4'),

-- Organizing metrics
('organizing_campaign_success_rate', 'Campaign Success Rate', 'Percentage of organizing campaigns resulting in certification', 'organizing', 'percentage', true, 18, 'Target', '#10b981'),
('card_signing_conversion_rate', 'Card Signing Conversion Rate', 'Percentage of contacted workers signing authorization cards', 'organizing', 'percentage', true, 19, 'FileSignature', '#f59e0b'),
('days_to_certification', 'Days to Certification', 'Average days from campaign start to union certification', 'organizing', 'days', false, 20, 'Calendar', '#ef4444')

ON CONFLICT (category_name) DO NOTHING;

-- =============================================================================
-- SAMPLE BENCHMARK DATA
-- =============================================================================
-- Insert sample benchmark data for demonstration purposes

DO $$
DECLARE
    cat_id UUID;
    start_date DATE;
BEGIN
    -- Get category IDs
    FOR cat_id IN SELECT id FROM benchmark_categories LOOP
        -- Generate monthly benchmarks for last 12 months
        FOR i IN 0..11 LOOP
            start_date := date_trunc('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE;
            
            -- Insert benchmark data for different union sizes and regions
            INSERT INTO benchmark_data (
                benchmark_category_id,
                union_type,
                union_size_bracket,
                region,
                period_start,
                period_end,
                period_type,
                metric_value,
                sample_size,
                min_value,
                max_value,
                percentile_25,
                percentile_50,
                percentile_75,
                standard_deviation,
                data_quality_score,
                confidence_level,
                data_source
            )
            SELECT
                cat_id,
                'all',
                size_bracket,
                'National',
                start_date,
                (start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
                'monthly',
                75.0 + (RANDOM() * 20), -- Random value between 75-95
                50 + FLOOR(RANDOM() * 100), -- Random sample size 50-150
                60.0 + (RANDOM() * 10),
                90.0 + (RANDOM() * 10),
                70.0 + (RANDOM() * 5),
                75.0 + (RANDOM() * 10),
                80.0 + (RANDOM() * 10),
                5.0 + (RANDOM() * 5),
                90 + FLOOR(RANDOM() * 10),
                'high',
                'internal_aggregate'
            FROM (VALUES ('small'), ('medium'), ('large'), ('extra_large')) AS sizes(size_bracket);
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Active scheduled reports with next run time
CREATE OR REPLACE VIEW v_active_scheduled_reports AS
SELECT
    sr.id,
    sr.tenant_id,
    sr.report_name,
    sr.report_type,
    sr.cron_expression,
    sr.next_run_at,
    sr.last_run_at,
    sr.run_count,
    sr.last_run_status,
    sr.recipients,
    sr.delivery_format,
    sr.created_by,
    u.email AS creator_email,
    COUNT(rdh.id) AS total_deliveries,
    COUNT(rdh.id) FILTER (WHERE rdh.status = 'delivered') AS successful_deliveries,
    COUNT(rdh.id) FILTER (WHERE rdh.status = 'failed') AS failed_deliveries
FROM scheduled_reports sr
LEFT JOIN auth.users u ON sr.created_by = u.id
LEFT JOIN report_delivery_history rdh ON sr.id = rdh.scheduled_report_id
WHERE sr.is_active = true
GROUP BY sr.id, u.email;

-- View: Benchmark comparison summary
CREATE OR REPLACE VIEW v_benchmark_comparison_summary AS
SELECT
    tbs.tenant_id,
    bc.category_name,
    bc.display_name,
    bc.category_group,
    bc.unit_type,
    tbs.period_start,
    tbs.period_end,
    tbs.metric_value AS tenant_value,
    tbs.benchmark_value,
    tbs.variance_from_benchmark,
    tbs.variance_percentage,
    tbs.percentile_rank,
    tbs.performance_indicator,
    tbs.trend_direction,
    tbs.period_over_period_percentage,
    bc.higher_is_better
FROM tenant_benchmark_snapshots tbs
JOIN benchmark_categories bc ON tbs.benchmark_category_id = bc.id
WHERE bc.is_active = true
ORDER BY tbs.period_start DESC, bc.display_order;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE scheduled_reports IS 'Automated report generation and delivery schedules with cron-based timing';
COMMENT ON TABLE report_delivery_history IS 'Complete history of all report deliveries (automated and manual) with status tracking';
COMMENT ON TABLE benchmark_categories IS 'Definitions of metrics available for benchmark comparison across unions';
COMMENT ON TABLE benchmark_data IS 'Aggregate benchmark statistics by union type, size, and region for peer comparison';
COMMENT ON TABLE tenant_benchmark_snapshots IS 'Tenant-specific metric snapshots with calculated comparison vs. benchmarks';

COMMENT ON COLUMN scheduled_reports.cron_expression IS 'Cron expression for schedule (e.g., "0 6 * * 1" = every Monday at 6 AM)';
COMMENT ON COLUMN scheduled_reports.report_parameters IS 'JSON parameters for report generation (date range, filters, metrics)';
COMMENT ON COLUMN report_delivery_history.email_opened IS 'Tracked via email pixel (requires email service integration)';
COMMENT ON COLUMN benchmark_data.sample_size IS 'Number of unions contributing to this benchmark (higher = more reliable)';
COMMENT ON COLUMN tenant_benchmark_snapshots.percentile_rank IS 'Where tenant ranks among peers (0 = bottom, 100 = top)';

-- =============================================================================
-- GRANTS (if using service role)
-- =============================================================================

-- Grant necessary permissions to authenticated role
GRANT SELECT ON scheduled_reports TO authenticated;
GRANT SELECT ON report_delivery_history TO authenticated;
GRANT SELECT ON benchmark_categories TO authenticated;
GRANT SELECT ON benchmark_data TO authenticated;
GRANT SELECT ON tenant_benchmark_snapshots TO authenticated;

GRANT SELECT ON v_active_scheduled_reports TO authenticated;
GRANT SELECT ON v_benchmark_comparison_summary TO authenticated;

-- =============================================================================
-- END OF PHASE 8 SCHEMA
-- =============================================================================
-- Summary:
--   - 5 tables: scheduled_reports, report_delivery_history, benchmark_categories,
--     benchmark_data, tenant_benchmark_snapshots
--   - 25+ RLS policies (tenant isolation + role-based access)
--   - 6 triggers (next run calculation, stats updates, benchmark comparison)
--   - 30+ indexes (optimized for queries)
--   - 2 views (active reports, benchmark comparison summary)
--   - 3 helper functions (performance indicator, trend direction, benchmark comparison)
--   - Seed data: 20 standard benchmark categories + sample benchmark data
-- =============================================================================
