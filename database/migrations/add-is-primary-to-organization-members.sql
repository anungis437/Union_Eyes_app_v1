-- Add isPrimary column to organization_members table
-- This allows marking one organization as the user's primary organization

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Create an index for faster primary organization lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_is_primary 
ON organization_members(user_id, is_primary) 
WHERE is_primary = true;

-- Add a comment explaining the column
COMMENT ON COLUMN organization_members.is_primary IS 
'Indicates if this is the users primary organization. Only one membership per user should have this set to true.';
