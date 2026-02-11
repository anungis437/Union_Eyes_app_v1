-- Migration: Create congress_memberships table
-- Purpose: Track CLC federation membership for organizations
-- Date: 2026-02-10

-- Create congress membership status enum
CREATE TYPE congress_membership_status AS ENUM (
  'active',
  'pending',
  'suspended',
  'terminated'
);

-- Create congress_memberships table
CREATE TABLE congress_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  congress_id UUID NOT NULL,
  
  -- Membership details
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status congress_membership_status NOT NULL DEFAULT 'active',
  
  -- Metadata for additional information
  metadata JSONB DEFAULT '{}',
  
  -- Tracking fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  -- Foreign key to organizations table
  CONSTRAINT fk_congress_memberships_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  
  -- Foreign key to congress organization (self-referential)
  CONSTRAINT fk_congress_memberships_congress
    FOREIGN KEY (congress_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate memberships
  CONSTRAINT uq_congress_memberships_org_congress
    UNIQUE (organization_id, congress_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_congress_memberships_org_id 
  ON congress_memberships(organization_id);

CREATE INDEX idx_congress_memberships_congress_id 
  ON congress_memberships(congress_id);

CREATE INDEX idx_congress_memberships_status 
  ON congress_memberships(status) 
  WHERE status = 'active';

CREATE INDEX idx_congress_memberships_joined_at 
  ON congress_memberships(joined_at DESC);

-- Create a composite index for queries that filter by both congress and status
CREATE INDEX idx_congress_memberships_congress_status 
  ON congress_memberships(congress_id, status) 
  WHERE status = 'active';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_congress_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_congress_memberships_updated_at
  BEFORE UPDATE ON congress_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_congress_memberships_updated_at();

-- Add comments for documentation
COMMENT ON TABLE congress_memberships IS 'Tracks CLC federation membership for labor organizations';
COMMENT ON COLUMN congress_memberships.organization_id IS 'The organization that is a member';
COMMENT ON COLUMN congress_memberships.congress_id IS 'The congress/federation organization (typically the CLC)';
COMMENT ON COLUMN congress_memberships.metadata IS 'Additional membership information such as charter details, voting rights, etc.';
