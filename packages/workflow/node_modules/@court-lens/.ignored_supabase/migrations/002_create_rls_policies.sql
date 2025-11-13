-- =========================================================================
-- COURTLENS BILLING SYSTEM - ROW LEVEL SECURITY POLICIES
-- Migration: 002_create_rls_policies.sql
-- Created: 2024
-- Description: Comprehensive RLS policies for multi-tenant security and IOLTA compliance
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- HELPER FUNCTIONS FOR RLS
-- =========================================================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'organization_id')::UUID,
        (SELECT organization_id FROM users WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = required_role 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is lawyer
CREATE OR REPLACE FUNCTION auth.is_lawyer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.has_role('lawyer') OR auth.has_role('admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access matter
CREATE OR REPLACE FUNCTION auth.can_access_matter(matter_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins can access all matters in their organization
    IF auth.is_admin() THEN
        RETURN EXISTS (
            SELECT 1 FROM matters m
            WHERE m.id = matter_id 
            AND m.organization_id = auth.get_user_organization_id()
        );
    END IF;
    
    -- Users can access matters they're responsible for or assigned to
    RETURN EXISTS (
        SELECT 1 FROM matters m
        WHERE m.id = matter_id
        AND m.organization_id = auth.get_user_organization_id()
        AND (
            m.responsible_lawyer_id = auth.uid() 
            OR m.originating_lawyer_id = auth.uid()
            OR m.created_by = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access client
CREATE OR REPLACE FUNCTION auth.can_access_client(client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins can access all clients in their organization
    IF auth.is_admin() THEN
        RETURN EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_id 
            AND c.organization_id = auth.get_user_organization_id()
        );
    END IF;
    
    -- Users can access clients through their matters
    RETURN EXISTS (
        SELECT 1 FROM clients c
        JOIN matters m ON c.id = m.client_id
        WHERE c.id = client_id
        AND c.organization_id = auth.get_user_organization_id()
        AND (
            m.responsible_lawyer_id = auth.uid()
            OR m.originating_lawyer_id = auth.uid()
            OR m.created_by = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- ORGANIZATIONS POLICIES
-- =========================================================================

-- Users can only see their own organization
CREATE POLICY organizations_select_policy ON organizations
    FOR SELECT USING (id = auth.get_user_organization_id());

-- Only admins can update organization settings
CREATE POLICY organizations_update_policy ON organizations
    FOR UPDATE USING (
        id = auth.get_user_organization_id() 
        AND auth.is_admin()
    );

-- =========================================================================
-- USERS POLICIES
-- =========================================================================

-- Users can see other users in their organization
CREATE POLICY users_select_policy ON users
    FOR SELECT USING (organization_id = auth.get_user_organization_id());

-- Users can update their own profile, admins can update any user in org
CREATE POLICY users_update_policy ON users
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND (id = auth.uid() OR auth.is_admin())
    );

-- Only admins can insert new users
CREATE POLICY users_insert_policy ON users
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- Only admins can delete users (soft delete via is_active)
CREATE POLICY users_delete_policy ON users
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- =========================================================================
-- CLIENTS POLICIES
-- =========================================================================

-- Users can see clients they have access to
CREATE POLICY clients_select_policy ON clients
    FOR SELECT USING (auth.can_access_client(id));

-- Lawyers and admins can create clients
CREATE POLICY clients_insert_policy ON clients
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_lawyer()
    );

-- Users can update clients they have access to
CREATE POLICY clients_update_policy ON clients
    FOR UPDATE USING (auth.can_access_client(id));

-- Only admins can delete clients
CREATE POLICY clients_delete_policy ON clients
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- =========================================================================
-- MATTER TYPES POLICIES
-- =========================================================================

-- All users in organization can see matter types
CREATE POLICY matter_types_select_policy ON matter_types
    FOR SELECT USING (organization_id = auth.get_user_organization_id());

-- Only admins can manage matter types
CREATE POLICY matter_types_insert_policy ON matter_types
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

CREATE POLICY matter_types_update_policy ON matter_types
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- =========================================================================
-- MATTERS POLICIES
-- =========================================================================

-- Users can see matters they have access to
CREATE POLICY matters_select_policy ON matters
    FOR SELECT USING (auth.can_access_matter(id));

-- Lawyers can create matters
CREATE POLICY matters_insert_policy ON matters
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_lawyer()
    );

-- Users can update matters they have access to
CREATE POLICY matters_update_policy ON matters
    FOR UPDATE USING (auth.can_access_matter(id));

-- Only admins can delete matters
CREATE POLICY matters_delete_policy ON matters
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- =========================================================================
-- TIME ENTRIES POLICIES
-- =========================================================================

-- Users can see time entries for matters they have access to
CREATE POLICY time_entries_select_policy ON time_entries
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (user_id = auth.uid() OR auth.can_access_matter(matter_id))
    );

-- Users can create their own time entries
CREATE POLICY time_entries_insert_policy ON time_entries
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND user_id = auth.uid()
        AND auth.can_access_matter(matter_id)
    );

-- Users can update their own time entries (if not billed), admins can update any
CREATE POLICY time_entries_update_policy ON time_entries
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND (
            (user_id = auth.uid() AND is_billed = false) 
            OR auth.is_admin()
        )
    );

-- Users can delete their own unbilled time entries, admins can delete any
CREATE POLICY time_entries_delete_policy ON time_entries
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
        AND (
            (user_id = auth.uid() AND is_billed = false) 
            OR auth.is_admin()
        )
    );

-- =========================================================================
-- ACTIVE TIMERS POLICIES
-- =========================================================================

-- Users can only see their own active timers
CREATE POLICY active_timers_select_policy ON active_timers
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND user_id = auth.uid()
    );

-- Users can create their own timers
CREATE POLICY active_timers_insert_policy ON active_timers
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND user_id = auth.uid()
        AND auth.can_access_matter(matter_id)
    );

-- Users can update their own timers
CREATE POLICY active_timers_update_policy ON active_timers
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND user_id = auth.uid()
    );

-- Users can delete their own timers
CREATE POLICY active_timers_delete_policy ON active_timers
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
        AND user_id = auth.uid()
    );

-- =========================================================================
-- TIME ENTRY TEMPLATES POLICIES
-- =========================================================================

-- Users can see organization-wide and their own templates
CREATE POLICY time_entry_templates_select_policy ON time_entry_templates
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (user_id IS NULL OR user_id = auth.uid() OR auth.is_admin())
    );

-- Users can create their own templates, admins can create organization-wide
CREATE POLICY time_entry_templates_insert_policy ON time_entry_templates
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND (user_id = auth.uid() OR (user_id IS NULL AND auth.is_admin()))
    );

-- Users can update their own templates, admins can update any
CREATE POLICY time_entry_templates_update_policy ON time_entry_templates
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND (user_id = auth.uid() OR auth.is_admin())
    );

-- =========================================================================
-- INVOICES POLICIES
-- =========================================================================

-- Users can see invoices for matters they have access to
CREATE POLICY invoices_select_policy ON invoices
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (
            auth.is_admin()
            OR auth.can_access_client(client_id)
            OR (matter_id IS NOT NULL AND auth.can_access_matter(matter_id))
        )
    );

-- Lawyers and admins can create invoices
CREATE POLICY invoices_insert_policy ON invoices
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_lawyer()
        AND auth.can_access_client(client_id)
    );

-- Users can update invoices they have access to (if not sent), admins can update any
CREATE POLICY invoices_update_policy ON invoices
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND (
            auth.is_admin()
            OR (auth.can_access_client(client_id) AND status = 'draft')
        )
    );

-- Only admins can delete invoices
CREATE POLICY invoices_delete_policy ON invoices
    FOR DELETE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- =========================================================================
-- INVOICE LINE ITEMS POLICIES
-- =========================================================================

-- Users can see line items for invoices they have access to
CREATE POLICY invoice_line_items_select_policy ON invoice_line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND i.organization_id = auth.get_user_organization_id()
            AND (
                auth.is_admin()
                OR auth.can_access_client(i.client_id)
            )
        )
    );

-- Users can insert line items for invoices they can access
CREATE POLICY invoice_line_items_insert_policy ON invoice_line_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = invoice_id
            AND i.organization_id = auth.get_user_organization_id()
            AND i.status = 'draft'
            AND (
                auth.is_admin()
                OR auth.can_access_client(i.client_id)
            )
        )
    );

-- =========================================================================
-- PAYMENTS POLICIES
-- =========================================================================

-- Users can see payments for clients they have access to
CREATE POLICY payments_select_policy ON payments
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (
            auth.is_admin()
            OR auth.can_access_client(client_id)
        )
    );

-- Authorized users can record payments
CREATE POLICY payments_insert_policy ON payments
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_lawyer()
        AND auth.can_access_client(client_id)
    );

-- Only admins can update payments
CREATE POLICY payments_update_policy ON payments
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- =========================================================================
-- TRUST ACCOUNTING POLICIES (IOLTA COMPLIANCE)
-- =========================================================================

-- Trust Accounts - Only admins and authorized users can see
CREATE POLICY trust_accounts_select_policy ON trust_accounts
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (auth.is_admin() OR auth.is_lawyer())
    );

-- Only admins can manage trust accounts
CREATE POLICY trust_accounts_insert_policy ON trust_accounts
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

CREATE POLICY trust_accounts_update_policy ON trust_accounts
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- Trust Transactions - Strict access control for IOLTA compliance
CREATE POLICY trust_transactions_select_policy ON trust_transactions
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (
            auth.is_admin()
            OR (auth.is_lawyer() AND auth.can_access_matter(matter_id))
        )
    );

-- Only authorized users can create trust transactions
CREATE POLICY trust_transactions_insert_policy ON trust_transactions
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND auth.is_lawyer()
        AND auth.can_access_matter(matter_id)
    );

-- Only admins can update trust transactions (for reconciliation)
CREATE POLICY trust_transactions_update_policy ON trust_transactions
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND auth.is_admin()
    );

-- No deletion of trust transactions (IOLTA compliance)
CREATE POLICY trust_transactions_no_delete ON trust_transactions
    FOR DELETE USING (false);

-- Trust Ledger - Read-only for most users, admins can reconcile
CREATE POLICY trust_ledger_select_policy ON trust_ledger
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (
            auth.is_admin()
            OR (auth.is_lawyer() AND auth.can_access_matter(matter_id))
        )
    );

-- Trust ledger is managed by triggers, no direct inserts
CREATE POLICY trust_ledger_insert_policy ON trust_ledger
    FOR INSERT WITH CHECK (false);

-- Only system can update trust ledger
CREATE POLICY trust_ledger_update_policy ON trust_ledger
    FOR UPDATE USING (false);

-- =========================================================================
-- EXPENSES POLICIES
-- =========================================================================

-- Users can see expenses for matters they have access to
CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (
            user_id = auth.uid()
            OR auth.is_admin()
            OR (matter_id IS NOT NULL AND auth.can_access_matter(matter_id))
        )
    );

-- Users can create their own expenses
CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
        AND user_id = auth.uid()
        AND (matter_id IS NULL OR auth.can_access_matter(matter_id))
    );

-- Users can update their own expenses (if not billed), admins can update any
CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE USING (
        organization_id = auth.get_user_organization_id()
        AND (
            (user_id = auth.uid() AND is_billed = false)
            OR auth.is_admin()
        )
    );

-- =========================================================================
-- AUDIT LOG POLICIES
-- =========================================================================

-- Admins can see all audit logs, users can see logs for records they can access
CREATE POLICY audit_log_select_policy ON audit_log
    FOR SELECT USING (
        organization_id = auth.get_user_organization_id()
        AND (
            auth.is_admin()
            OR user_id = auth.uid()
        )
    );

-- System inserts audit logs, users cannot insert directly
CREATE POLICY audit_log_insert_policy ON audit_log
    FOR INSERT WITH CHECK (
        organization_id = auth.get_user_organization_id()
    );

-- No updates or deletes of audit logs (compliance requirement)
CREATE POLICY audit_log_no_update ON audit_log FOR UPDATE USING (false);
CREATE POLICY audit_log_no_delete ON audit_log FOR DELETE USING (false);

-- =========================================================================
-- VIEWS POLICIES
-- =========================================================================

-- Grant access to views for appropriate users
GRANT SELECT ON client_aging TO authenticated;
GRANT SELECT ON matter_financials TO authenticated;

-- =========================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =========================================================================

-- Function to check IOLTA compliance access
CREATE OR REPLACE FUNCTION auth.can_access_trust_data()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.is_lawyer() OR auth.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate trust transaction amounts
CREATE OR REPLACE FUNCTION validate_trust_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure only authorized users can create trust transactions
    IF NOT auth.can_access_trust_data() THEN
        RAISE EXCEPTION 'Access denied: Insufficient permissions for trust transactions';
    END IF;
    
    -- Validate that withdrawal doesn't exceed available balance
    IF NEW.transaction_type = 'withdrawal' AND NEW.amount < 0 THEN
        IF (SELECT COALESCE(balance, 0) FROM trust_ledger 
            WHERE client_id = NEW.client_id 
            AND matter_id = NEW.matter_id 
            AND trust_account_id = NEW.trust_account_id) < ABS(NEW.amount) THEN
            RAISE EXCEPTION 'Insufficient trust funds for withdrawal';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_trust_transaction_trigger
    BEFORE INSERT ON trust_transactions
    FOR EACH ROW EXECUTE FUNCTION validate_trust_transaction();

-- =========================================================================
-- GRANTS FOR APPLICATION ROLES
-- =========================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION auth.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_lawyer() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.can_access_matter(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.can_access_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth.can_access_trust_data() TO authenticated;