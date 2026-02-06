-- Migration 063: Enable RLS on Member Documents
-- Priority: CRITICAL  
-- Impact: Protects sensitive personal documents (tax slips, IDs, certifications)

-- Enable RLS
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own documents
CREATE POLICY member_documents_select_own ON member_documents
    FOR SELECT
    USING (user_id = get_current_user_id());

-- Policy: Organization admins can see documents of users in their organizations
CREATE POLICY member_documents_select_org_admin ON member_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om_viewer
            INNER JOIN organization_members om_owner ON om_owner.user_id = member_documents.user_id
            WHERE om_viewer.user_id = get_current_user_id()
                AND om_viewer.organization_id = om_owner.organization_id
                AND om_viewer.role IN ('admin', 'officer', 'staff')
        )
    );

-- Policy: Users can upload their own documents
CREATE POLICY member_documents_insert_own ON member_documents
    FOR INSERT
    WITH CHECK (user_id = get_current_user_id());

-- Policy: Organization admins/staff can upload documents for users
CREATE POLICY member_documents_insert_org_admin ON member_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members om_viewer
            INNER JOIN organization_members om_owner ON om_owner.user_id = member_documents.user_id
            WHERE om_viewer.user_id = get_current_user_id()
                AND om_viewer.organization_id = om_owner.organization_id
                AND om_viewer.role IN ('admin', 'officer', 'staff')
        )
    );

-- Policy: Users can update their own documents
CREATE POLICY member_documents_update_own ON member_documents
    FOR UPDATE
    USING (user_id = get_current_user_id());

-- Policy: Organization admins can update member documents
CREATE POLICY member_documents_update_org_admin ON member_documents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om_viewer
            INNER JOIN organization_members om_owner ON om_owner.user_id = member_documents.user_id
            WHERE om_viewer.user_id = get_current_user_id()
                AND om_viewer.organization_id = om_owner.organization_id
                AND om_viewer.role IN ('admin', 'officer')
        )
    );

-- Policy: Users can delete their own documents
CREATE POLICY member_documents_delete_own ON member_documents
    FOR DELETE
    USING (user_id = get_current_user_id());

-- Policy: Only organization admins can delete member documents
CREATE POLICY member_documents_delete_org_admin ON member_documents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members om_viewer
            INNER JOIN organization_members om_owner ON om_owner.user_id = member_documents.user_id
            WHERE om_viewer.user_id = get_current_user_id()
                AND om_viewer.organization_id = om_owner.organization_id
                AND om_viewer.role = 'admin'
        )
    );

-- Add comments
COMMENT ON POLICY member_documents_select_own ON member_documents IS 
    'Members can see their own documents';
COMMENT ON POLICY member_documents_select_org_admin ON member_documents IS 
    'Organization admins/officers/staff can see documents of members in their organizations';
COMMENT ON POLICY member_documents_insert_own ON member_documents IS 
    'Members can upload their own documents';
COMMENT ON POLICY member_documents_insert_org_admin ON member_documents IS 
    'Organization admins/officers/staff can upload documents for members';
COMMENT ON POLICY member_documents_update_own ON member_documents IS 
    'Members can update their own documents';
COMMENT ON POLICY member_documents_update_org_admin ON member_documents IS 
    'Organization admins/officers can update member documents';
COMMENT ON POLICY member_documents_delete_own ON member_documents IS 
    'Members can delete their own documents';
COMMENT ON POLICY member_documents_delete_org_admin ON member_documents IS 
    'Only organization admins can delete member documents';
