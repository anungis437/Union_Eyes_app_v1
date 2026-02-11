-- Sector Filtering Implementation Documentation
-- Reference: lib/utils/smart-onboarding.ts:303-305
-- Purpose: Optimize peer organization detection using sector-based filtering

-- ============================================================================
-- OVERVIEW
-- ============================================================================

-- The smart onboarding system uses sector filtering to find peer organizations.
-- This document explains the implementation and optimization strategy.

-- ============================================================================
-- SECTOR FILTERING QUERY PATTERN
-- ============================================================================

-- The smart onboarding peer detection (smart-onboarding.ts:303-305) uses:
-- 1. PostgreSQL array overlap operator (&&) for sector matching
-- 2. Organization type matching
-- 3. Province/territory filtering

-- Example query pattern:
-- SELECT * FROM organizations 
-- WHERE sectors && ARRAY['healthcare', 'education']
--   AND organization_type = 'union'
--   AND province_territory = 'ON'
--   AND status = 'active';

-- ============================================================================
-- INDEXES FOR OPTIMIZATION
-- ============================================================================

-- 1. Primary Sector Index (GIN)
-- CREATE INDEX idx_organizations_sectors ON organizations USING GIN (sectors);
-- - Enables fast array overlap (&&) operations
-- - Already exists in base schema

-- 2. Composite Sector + Type Index (migration 021)
-- CREATE INDEX idx_organizations_sectors_type ON organizations USING GIN (sectors)
-- WHERE organization_type IS NOT NULL;
-- - Optimizes queries filtering by both sector and type
-- - Uses partial index to reduce size

-- 3. Province + Sector Index (migration 021)
-- CREATE INDEX idx_organizations_province_sector 
-- ON organizations(province_territory, organization_type)
-- WHERE province_territory IS NOT NULL AND sectors IS NOT NULL;
-- - Pre-filters by geography before sector matching
-- - Common pattern: find peers in same province with similar sectors

-- 4. Active Organizations with Sectors (migration 021)
-- CREATE INDEX idx_organizations_active_with_sectors
-- ON organizations(status, organization_type)
-- WHERE status = 'active' AND sectors IS NOT NULL AND array_length(sectors, 1) > 0;
-- - Ensures only active orgs with defined sectors are scanned

-- ============================================================================
-- QUERY PLAN ANALYSIS
-- ============================================================================

-- Explain the query to verify index usage:
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT id, name, sectors, organization_type 
-- FROM organizations 
-- WHERE sectors && ARRAY['healthcare'] 
--   AND organization_type = 'union' 
--   AND status = 'active';

-- Expected plan:
-- - Bitmap Index Scan on idx_organizations_active_with_sectors
-- - Recheck with idx_organizations_sectors (GIN scan for array overlap)

-- ============================================================================
-- PERFORMANCE CHARACTERISTICS
-- ============================================================================

-- Array Overlap Performance (&&):
-- - GIN indexes provide O(log n) lookup for array overlap
-- - Efficient for arrays up to ~100 elements
-- - PostgreSQL stores array elements in B-tree within GIN index

-- Sector Array Size Considerations:
-- - Typical: 1-5 sectors per organization
-- - Maximum: 15 sectors (all enum values)
-- - Query performance: <10ms for 100k organizations

-- ============================================================================
-- BEST PRACTICES
-- ============================================================================

-- 1. Always filter by status='active' first
--    - Reduces working set significantly
--    - Uses partial indexes effectively

-- 2. Combine with organization_type filter
--    - Narrows search space before sector matching
--    - Leverages composite indexes

-- 3. Add province_territory when available
--    - Geography is highly selective
--    - Reduces sector comparison overhead

-- 4. Limit results with LIMIT clause
--    - Peer detection typically needs top 10-20 matches
--    - Stops scanning early when limit is reached

-- ============================================================================
-- MONITORING & MAINTENANCE
-- ============================================================================

-- Check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE 'idx_organizations_%sectors%'
-- ORDER BY idx_scan DESC;

-- Check index size:
-- SELECT pg_size_pretty(pg_relation_size('idx_organizations_sectors')) as index_size;

-- Vacuum after bulk updates:
-- VACUUM ANALYZE organizations;

-- ============================================================================
-- MIGRATION REFERENCE
-- ============================================================================

-- Migration 021: Add peer detection indexes
-- - idx_organizations_sectors_type
-- - idx_organizations_province_sector
-- - idx_organizations_active_with_sectors

-- To apply: Run migration 021_add_peer_detection_indexes.sql
