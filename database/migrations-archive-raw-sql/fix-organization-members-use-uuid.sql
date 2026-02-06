-- Migration: Fix organization_members to use UUID instead of slug for organization_id
-- This script converts organization_id from TEXT (slug) to UUID (actual organization ID)

BEGIN;

-- Step 1: Add a temporary column to store the UUID
ALTER TABLE organization_members 
ADD COLUMN organization_id_uuid UUID;

-- Step 2: Update the new column by looking up the UUID from the slug
UPDATE organization_members om
SET organization_id_uuid = o.id
FROM organizations o
WHERE om.organization_id = o.slug;

-- Step 3: Check if any memberships couldn't be mapped
SELECT 
    om.user_id,
    om.organization_id AS slug_value,
    CASE 
        WHEN om.organization_id_uuid IS NULL THEN 'UNMAPPED - needs manual fix'
        ELSE 'Mapped successfully'
    END AS status
FROM organization_members om
WHERE organization_id_uuid IS NULL;

-- If the above query returns rows, you need to fix those manually before proceeding
-- Otherwise, continue with the migration:

-- Step 4: Drop the old TEXT column
ALTER TABLE organization_members 
DROP COLUMN organization_id;

-- Step 5: Rename the new UUID column to organization_id
ALTER TABLE organization_members 
RENAME COLUMN organization_id_uuid TO organization_id;

-- Step 6: Add NOT NULL constraint
ALTER TABLE organization_members 
ALTER COLUMN organization_id SET NOT NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE organization_members 
ADD CONSTRAINT organization_members_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- Step 8: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id 
ON organization_members(organization_id);

-- Step 9: Recreate unique constraint
DROP INDEX IF EXISTS unique_org_membership;
CREATE UNIQUE INDEX unique_org_membership 
ON organization_members(organization_id, user_id);

COMMIT;

-- Verify the migration
SELECT 
    om.user_id,
    om.organization_id,
    o.name AS org_name,
    o.slug AS org_slug,
    om.role
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
LIMIT 10;
