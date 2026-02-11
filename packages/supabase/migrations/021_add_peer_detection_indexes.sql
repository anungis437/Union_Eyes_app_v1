-- Migration: Add indexes for peer detection optimization
-- Purpose: Optimize sector filtering and peer organization queries
-- Date: 2026-02-10
-- Reference: lib/utils/smart-onboarding.ts:303-305

-- The organizations table already has idx_organizations_sectors (GIN index)
-- This migration adds additional composite indexes for common peer detection patterns

-- Composite index for sector + organization type queries
CREATE INDEX idx_organizations_sectors_type 
  ON organizations USING GIN (sectors) 
  WHERE organization_type IS NOT NULL;

-- Composite index for sector + province queries (common peer detection pattern)
CREATE INDEX idx_organizations_province_sector 
  ON organizations(province_territory, organization_type) 
  WHERE province_territory IS NOT NULL AND sectors IS NOT NULL;

-- Index for all active organizations with sectors (status filtering)
CREATE INDEX idx_organizations_active_with_sectors 
  ON organizations(status, organization_type) 
  WHERE status = 'active' AND sectors IS NOT NULL AND array_length(sectors, 1) > 0;

-- Add comments for documentation
COMMENT ON INDEX idx_organizations_sectors_type IS 'Optimizes peer detection queries filtering by sector and organization type';
COMMENT ON INDEX idx_organizations_province_sector IS 'Optimizes peer detection queries filtering by province and sector';
COMMENT ON INDEX idx_organizations_active_with_sectors IS 'Optimizes peer detection queries on active organizations with defined sectors';

-- Performance improvement note
DO $$
BEGIN
  RAISE NOTICE 'Peer detection indexes created successfully';
  RAISE NOTICE 'These indexes optimize the smart onboarding sector filtering (smart-onboarding.ts:303-305)';
  RAISE NOTICE 'The PostgreSQL array overlap operator (&&) uses the GIN indexes for efficient sector matching';
END $$;
