-- Migration: Add full-text search for members
-- Description: Create GIN index for fast member search across name, email, position, department
-- Date: 2025-11-14

-- Step 1: Add tsvector column for full-text search
ALTER TABLE organization_members 
ADD COLUMN search_vector tsvector;

-- Step 2: Create function to generate search vector
CREATE OR REPLACE FUNCTION organization_members_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.position, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.department, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.membership_number, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically update search vector
CREATE TRIGGER organization_members_search_vector_update
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION organization_members_search_vector();

-- Step 4: Populate search_vector for existing records
UPDATE organization_members 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(position, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(department, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(membership_number, '')), 'A');

-- Step 5: Create GIN index for fast full-text search
CREATE INDEX idx_org_members_search_vector ON organization_members USING GIN(search_vector);

-- Step 6: Create additional indexes for common search patterns
CREATE INDEX idx_org_members_name_trgm ON organization_members USING gin (name gin_trgm_ops);
CREATE INDEX idx_org_members_email_trgm ON organization_members USING gin (email gin_trgm_ops);

COMMENT ON COLUMN organization_members.search_vector IS 'Full-text search vector for name, email, position, department, membership_number';
COMMENT ON INDEX idx_org_members_search_vector IS 'GIN index for fast full-text search across member fields';
COMMENT ON TRIGGER organization_members_search_vector_update ON organization_members IS 'Auto-updates search_vector on insert/update';

-- Example search query (for reference):
-- SELECT * FROM organization_members 
-- WHERE search_vector @@ to_tsquery('english', 'john & smith')
-- AND tenant_id = '00000000-0000-0000-0000-000000000001'
-- ORDER BY ts_rank(search_vector, to_tsquery('english', 'john & smith')) DESC;
