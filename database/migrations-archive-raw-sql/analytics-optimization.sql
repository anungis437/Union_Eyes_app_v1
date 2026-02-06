/**
 * Database Optimization for Analytics
 * 
 * Creates indexes and materialized views for improved query performance
 * Run this migration to optimize analytics queries
 * 
 * Created: November 15, 2025
 */

-- ==========================================
-- Analytics Indexes
-- ==========================================

-- Claims table indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_claims_tenant_created 
ON claims(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_tenant_status 
ON claims(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_claims_tenant_incident_date 
ON claims(tenant_id, incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_claims_tenant_closed 
ON claims(tenant_id, closed_at DESC) WHERE status = 'resolved';

CREATE INDEX IF NOT EXISTS idx_claims_tenant_category 
ON claims(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_claims_tenant_assigned 
ON claims(tenant_id, assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_tenant_priority 
ON claims(tenant_id, priority);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_claims_tenant_status_created 
ON claims(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_tenant_category_status 
ON claims(tenant_id, category, status);

-- Financial analytics indexes
CREATE INDEX IF NOT EXISTS idx_claims_tenant_outcome 
ON claims(tenant_id, resolution_outcome) WHERE status = 'resolved';

CREATE INDEX IF NOT EXISTS idx_claims_financial_metrics 
ON claims(tenant_id, status, claim_amount, settlement_amount, legal_costs);

-- ==========================================
-- Members table indexes for analytics
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_members_tenant_status 
ON members(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_members_tenant_created 
ON members(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_members_tenant_type 
ON members(tenant_id, member_type);

-- ==========================================
-- Claim Updates indexes for timeline queries
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_claim_updates_claim_created 
ON claim_updates(claim_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claim_updates_user 
ON claim_updates(user_id, created_at DESC);

-- ==========================================
-- Materialized View for Daily Aggregations
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_summary AS
SELECT 
  tenant_id,
  DATE(created_at) as date,
  COUNT(*) as total_claims,
  COUNT(CASE WHEN status IN ('under_review', 'assigned', 'investigation', 'pending_documentation') THEN 1 END) as active_claims,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_claims,
  AVG(CASE WHEN status = 'resolved' AND closed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400 END) as avg_resolution_days,
  SUM(claim_amount) as total_claim_value,
  SUM(CASE WHEN resolution_outcome = 'won' THEN settlement_amount ELSE 0 END) as total_settlements,
  SUM(legal_costs + COALESCE(court_costs, 0)) as total_costs
FROM claims
GROUP BY tenant_id, DATE(created_at);

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_tenant_date 
ON analytics_daily_summary(tenant_id, date DESC);

-- ==========================================
-- Function to refresh materialized view
-- ==========================================

CREATE OR REPLACE FUNCTION refresh_analytics_daily_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Materialized View for Member Analytics
-- ==========================================

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_member_summary AS
SELECT 
  m.tenant_id,
  m.id as member_id,
  m.member_number,
  COUNT(c.id) as total_claims,
  COUNT(CASE WHEN c.status IN ('under_review', 'assigned', 'investigation', 'pending_documentation') THEN 1 END) as active_claims,
  COUNT(CASE WHEN c.status = 'resolved' THEN 1 END) as resolved_claims,
  SUM(c.claim_amount) as total_claim_value,
  AVG(CASE WHEN c.status = 'resolved' AND c.closed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (c.closed_at - c.created_at)) / 86400 END) as avg_resolution_days,
  MAX(c.created_at) as last_claim_date
FROM members m
LEFT JOIN claims c ON c.member_id = m.id
GROUP BY m.tenant_id, m.id, m.member_number;

-- Index on member analytics view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_member_tenant_id 
ON analytics_member_summary(tenant_id, member_id);

-- ==========================================
-- Function to refresh member analytics
-- ==========================================

CREATE OR REPLACE FUNCTION refresh_analytics_member_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_member_summary;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Scheduled Job Setup (using pg_cron if available)
-- ==========================================

-- Refresh daily summary every night at 2 AM
-- SELECT cron.schedule('refresh-analytics-daily', '0 2 * * *', 'SELECT refresh_analytics_daily_summary()');

-- Refresh member summary every 6 hours
-- SELECT cron.schedule('refresh-analytics-members', '0 */6 * * *', 'SELECT refresh_analytics_member_summary()');

-- ==========================================
-- Query Performance Functions
-- ==========================================

-- Function to get analytics for date range (optimized)
CREATE OR REPLACE FUNCTION get_analytics_for_range(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_claims BIGINT,
  active_claims BIGINT,
  resolved_claims BIGINT,
  avg_resolution_days NUMERIC,
  total_value NUMERIC,
  total_settlements NUMERIC,
  total_costs NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(ads.total_claims)::BIGINT,
    SUM(ads.active_claims)::BIGINT,
    SUM(ads.resolved_claims)::BIGINT,
    AVG(ads.avg_resolution_days)::NUMERIC,
    SUM(ads.total_claim_value)::NUMERIC,
    SUM(ads.total_settlements)::NUMERIC,
    SUM(ads.total_costs)::NUMERIC
  FROM analytics_daily_summary ads
  WHERE ads.tenant_id = p_tenant_id
    AND ads.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Vacuum and Analyze Recommendations
-- ==========================================

-- Run these commands regularly to maintain performance:
-- VACUUM ANALYZE claims;
-- VACUUM ANALYZE members;
-- VACUUM ANALYZE claim_updates;
-- ANALYZE analytics_daily_summary;
-- ANALYZE analytics_member_summary;

-- ==========================================
-- Statistics
-- ==========================================

-- Update statistics for query planner
ANALYZE claims;
ANALYZE members;
ANALYZE claim_updates;
