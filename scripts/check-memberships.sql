-- Query to find orphaned organization memberships

-- 1. Check all memberships and their organization references
SELECT 
    om.id AS membership_id,
    om.user_id,
    om.organization_id,
    om.tenant_id AS legacy_tenant_id,
    om.role,
    om.status,
    o.name AS org_name,
    o.slug AS org_slug,
    CASE 
        WHEN o.id IS NULL THEN 'ORPHANED - Organization not found'
        ELSE 'Valid'
    END AS membership_status
FROM organization_members om
LEFT JOIN organizations o ON om.organization_id = o.id
ORDER BY membership_status DESC, om.user_id;

-- 2. Count orphaned memberships
SELECT 
    COUNT(*) AS total_orphaned
FROM organization_members om
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE o.id IS NULL;

-- 3. List all valid organizations
SELECT 
    id,
    name,
    slug,
    organization_type,
    legacy_tenant_id,
    created_at
FROM organizations
ORDER BY created_at DESC;

-- 4. Count memberships per organization
SELECT 
    o.name AS organization_name,
    o.slug,
    COUNT(om.id) AS member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.slug
ORDER BY member_count DESC;
