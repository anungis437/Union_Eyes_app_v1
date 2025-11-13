-- =====================================================
-- Migration: 015_create_multi_tenant_schema.sql
-- Description: Multi-tenant architecture with organization isolation
-- Author: CourtLens Platform Team
-- Created: 2025-10-23
-- Version: 1.0.0
-- 
-- This migration implements enterprise-grade multi-tenancy:
-- - Organizations (tenants) with complete data isolation
-- - Organization members with role-based access
-- - Organization settings with hierarchical configuration
-- - Billing and subscription management (Stripe-ready)
-- - Usage tracking and limits enforcement
-- - Comprehensive audit logging
-- - RLS policies for security
-- =====================================================

-- =====================================================
-- TABLE: organizations
-- Purpose: Root tenant table - each organization is an isolated tenant
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization details
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly identifier
    display_name VARCHAR(255), -- Formatted name for display
    description TEXT,
    
    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Canada',
    
    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    accent_color VARCHAR(7) DEFAULT '#10B981',
    
    -- Status and lifecycle
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
    trial_ends_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspended_reason TEXT,
    
    -- Billing information
    billing_email VARCHAR(255),
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    current_plan VARCHAR(50) DEFAULT 'free' CHECK (current_plan IN ('free', 'starter', 'professional', 'enterprise')),
    
    -- Limits and quotas
    max_users INTEGER DEFAULT 1,
    max_matters INTEGER DEFAULT 10,
    max_storage_gb NUMERIC(10, 2) DEFAULT 0.1, -- 100MB
    max_api_calls_per_day INTEGER DEFAULT 1000,
    
    -- Feature flags
    features JSONB DEFAULT '{}'::jsonb, -- {"advanced_analytics": true, "custom_branding": false}
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for custom fields
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ, -- Soft delete support
    
    -- Constraints
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_email CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$' OR email IS NULL),
    CONSTRAINT valid_billing_email CHECK (billing_email ~ '^[^@]+@[^@]+\.[^@]+$' OR billing_email IS NULL),
    CONSTRAINT positive_limits CHECK (
        max_users > 0 AND 
        max_matters > 0 AND 
        max_storage_gb > 0 AND 
        max_api_calls_per_day > 0
    )
);

-- Indexes for organizations
CREATE INDEX idx_organizations_slug ON public.organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_status ON public.organizations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_organizations_created_at ON public.organizations(created_at DESC);

-- =====================================================
-- TABLE: organization_members
-- Purpose: User-to-organization mapping with roles
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role and permissions
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
    
    -- Additional permissions (additive to role)
    custom_permissions JSONB DEFAULT '[]'::jsonb, -- ["matter.delete", "billing.view"]
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    
    -- Invitation tracking
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    
    -- Last activity
    last_seen_at TIMESTAMPTZ,
    last_ip_address INET,
    
    -- Metadata
    title VARCHAR(100), -- Job title within organization
    department VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_org_member UNIQUE (organization_id, user_id),
    CONSTRAINT at_least_one_owner CHECK (
        role != 'owner' OR 
        EXISTS (
            SELECT 1 FROM public.organization_members om2
            WHERE om2.organization_id = organization_members.organization_id
            AND om2.role = 'owner'
            AND om2.status = 'active'
        )
    )
);

-- Indexes for organization_members
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_role ON public.organization_members(organization_id, role);
CREATE INDEX idx_org_members_status ON public.organization_members(organization_id, status);
CREATE INDEX idx_org_members_last_seen ON public.organization_members(organization_id, last_seen_at DESC);

-- =====================================================
-- TABLE: organization_settings
-- Purpose: Tenant-specific configuration with inheritance
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_settings (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Setting identification
    setting_key VARCHAR(100) NOT NULL,
    setting_category VARCHAR(50) DEFAULT 'general', -- general, security, billing, features
    
    -- Value storage (polymorphic)
    value_text TEXT,
    value_number NUMERIC,
    value_boolean BOOLEAN,
    value_json JSONB,
    value_date TIMESTAMPTZ,
    
    -- Metadata
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE, -- Encrypt in logs
    is_inherited BOOLEAN DEFAULT FALSE, -- Can be overridden by users
    
    -- Validation
    allowed_values JSONB, -- ["value1", "value2"] for enums
    validation_regex VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT unique_org_setting UNIQUE (organization_id, setting_key),
    CONSTRAINT valid_category CHECK (setting_category IN ('general', 'security', 'billing', 'features', 'notifications', 'integrations'))
);

-- Indexes for organization_settings
CREATE INDEX idx_org_settings_org_id ON public.organization_settings(organization_id);
CREATE INDEX idx_org_settings_key ON public.organization_settings(organization_id, setting_key);
CREATE INDEX idx_org_settings_category ON public.organization_settings(organization_id, setting_category);

-- =====================================================
-- TABLE: billing_subscriptions
-- Purpose: Stripe subscription tracking and management
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Stripe integration
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    stripe_product_id VARCHAR(255) NOT NULL,
    
    -- Subscription details
    plan_name VARCHAR(50) NOT NULL CHECK (plan_name IN ('free', 'starter', 'professional', 'enterprise')),
    billing_interval VARCHAR(20) DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
    
    -- Pricing
    amount_cents INTEGER NOT NULL, -- Store in cents
    currency VARCHAR(3) DEFAULT 'CAD',
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'unpaid')),
    
    -- Lifecycle dates
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    ended_at TIMESTAMPTZ,
    
    -- Billing
    next_invoice_date TIMESTAMPTZ,
    last_invoice_date TIMESTAMPTZ,
    last_invoice_amount_cents INTEGER,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount_cents >= 0),
    CONSTRAINT valid_dates CHECK (current_period_end > current_period_start)
);

-- Indexes for billing_subscriptions
CREATE INDEX idx_billing_subs_org_id ON public.billing_subscriptions(organization_id);
CREATE INDEX idx_billing_subs_stripe_id ON public.billing_subscriptions(stripe_subscription_id);
CREATE INDEX idx_billing_subs_status ON public.billing_subscriptions(organization_id, status);
CREATE INDEX idx_billing_subs_period_end ON public.billing_subscriptions(current_period_end) WHERE status = 'active';

-- =====================================================
-- TABLE: billing_usage
-- Purpose: Track usage metrics for billing and limits
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_usage (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Usage period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Usage metrics
    active_users INTEGER DEFAULT 0,
    matters_created INTEGER DEFAULT 0,
    documents_uploaded INTEGER DEFAULT 0,
    storage_used_gb NUMERIC(10, 2) DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    
    -- Feature usage
    advanced_analytics_used INTEGER DEFAULT 0,
    ai_queries INTEGER DEFAULT 0,
    exports_generated INTEGER DEFAULT 0,
    
    -- Overage tracking
    users_overage INTEGER DEFAULT 0,
    matters_overage INTEGER DEFAULT 0,
    storage_overage_gb NUMERIC(10, 2) DEFAULT 0,
    api_calls_overage INTEGER DEFAULT 0,
    
    -- Billing impact
    overage_charges_cents INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_end > period_start),
    CONSTRAINT non_negative_usage CHECK (
        active_users >= 0 AND
        matters_created >= 0 AND
        documents_uploaded >= 0 AND
        storage_used_gb >= 0 AND
        api_calls >= 0
    )
);

-- Indexes for billing_usage
CREATE INDEX idx_billing_usage_org_id ON public.billing_usage(organization_id);
CREATE INDEX idx_billing_usage_period ON public.billing_usage(organization_id, period_start DESC);
CREATE INDEX idx_billing_usage_current ON public.billing_usage(organization_id, period_end) WHERE period_end > NOW();

-- =====================================================
-- TABLE: organization_audit_log
-- Purpose: Comprehensive audit trail for organizational actions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_audit_log (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL, -- organization.created, member.added, settings.updated
    entity_type VARCHAR(50) NOT NULL, -- organization, member, settings, billing
    entity_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Result
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_action CHECK (action ~ '^[a-z_]+\.[a-z_]+$')
);

-- Indexes for organization_audit_log
CREATE INDEX idx_org_audit_org_id ON public.organization_audit_log(organization_id, created_at DESC);
CREATE INDEX idx_org_audit_user_id ON public.organization_audit_log(user_id, created_at DESC);
CREATE INDEX idx_org_audit_action ON public.organization_audit_log(organization_id, action);
CREATE INDEX idx_org_audit_entity ON public.organization_audit_log(organization_id, entity_type, entity_id);

-- =====================================================
-- UPDATE EXISTING TABLES
-- Add organization_id to all data tables for tenant isolation
-- =====================================================

-- Note: This is a template. Apply to all existing tables that need tenant isolation
-- Example for matters table (repeat for documents, clients, tasks, etc.)

/*
ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_matters_org_id ON public.matters(organization_id);

-- Backfill with default organization (run after creating default org)
-- UPDATE public.matters SET organization_id = '<default-org-id>' WHERE organization_id IS NULL;

-- Make NOT NULL after backfill
-- ALTER TABLE public.matters ALTER COLUMN organization_id SET NOT NULL;
*/

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICY: organizations
-- Users can only see organizations they're members of
-- =====================================================

CREATE POLICY "users_can_view_own_organizations" ON public.organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "owners_can_update_organization" ON public.organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "owners_can_delete_organization" ON public.organizations
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "authenticated_users_can_create_organization" ON public.organizations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- RLS POLICY: organization_members
-- Members can view other members in their organizations
-- =====================================================

CREATE POLICY "members_can_view_org_members" ON public.organization_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
);

CREATE POLICY "admins_can_manage_members" ON public.organization_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- =====================================================
-- RLS POLICY: organization_settings
-- Settings are organization-scoped
-- =====================================================

CREATE POLICY "members_can_view_settings" ON public.organization_settings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = organization_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "admins_can_manage_settings" ON public.organization_settings
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = organization_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
);

-- =====================================================
-- RLS POLICY: billing_subscriptions
-- Billing visible to admins and owners
-- =====================================================

CREATE POLICY "admins_can_view_billing" ON public.billing_subscriptions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = billing_subscriptions.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
);

CREATE POLICY "owners_can_manage_billing" ON public.billing_subscriptions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = billing_subscriptions.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'owner'
        AND organization_members.status = 'active'
    )
);

-- =====================================================
-- RLS POLICY: billing_usage
-- Usage metrics visible to admins
-- =====================================================

CREATE POLICY "admins_can_view_usage" ON public.billing_usage
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = billing_usage.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
);

-- =====================================================
-- RLS POLICY: organization_audit_log
-- Audit logs visible to admins
-- =====================================================

CREATE POLICY "admins_can_view_audit_log" ON public.organization_audit_log
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = organization_audit_log.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
        AND organization_members.status = 'active'
    )
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get user's current organization from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        (auth.jwt() ->> 'organization_id')::uuid,
        NULL
    );
$$;

-- Function: Check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_organization_member(
    p_organization_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_organization_id
        AND user_id = p_user_id
        AND status = 'active'
    );
$$;

-- Function: Check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.has_organization_role(
    p_organization_id UUID,
    p_role VARCHAR,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_organization_id
        AND user_id = p_user_id
        AND role = p_role
        AND status = 'active'
    );
$$;

-- Function: Get user's role in organization
CREATE OR REPLACE FUNCTION public.get_user_organization_role(
    p_organization_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND status = 'active'
    LIMIT 1;
$$;

-- Function: Get organization's current usage for a metric
CREATE OR REPLACE FUNCTION public.get_current_usage(
    p_organization_id UUID,
    p_metric VARCHAR -- 'users', 'matters', 'storage_gb', 'api_calls'
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_usage NUMERIC;
BEGIN
    SELECT
        CASE p_metric
            WHEN 'users' THEN active_users
            WHEN 'matters' THEN matters_created
            WHEN 'storage_gb' THEN storage_used_gb
            WHEN 'api_calls' THEN api_calls
            ELSE 0
        END INTO v_usage
    FROM public.billing_usage
    WHERE organization_id = p_organization_id
    AND period_end > NOW()
    ORDER BY period_start DESC
    LIMIT 1;
    
    RETURN COALESCE(v_usage, 0);
END;
$$;

-- Function: Check if organization is within limits
CREATE OR REPLACE FUNCTION public.is_within_limits(
    p_organization_id UUID,
    p_metric VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_current_usage NUMERIC;
    v_limit NUMERIC;
BEGIN
    -- Get current usage
    v_current_usage := public.get_current_usage(p_organization_id, p_metric);
    
    -- Get limit from organization
    SELECT
        CASE p_metric
            WHEN 'users' THEN max_users
            WHEN 'matters' THEN max_matters
            WHEN 'storage_gb' THEN max_storage_gb
            WHEN 'api_calls' THEN max_api_calls_per_day
            ELSE 999999
        END INTO v_limit
    FROM public.organizations
    WHERE id = p_organization_id;
    
    -- Check if within limit
    RETURN (v_current_usage + p_increment) <= v_limit;
END;
$$;

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update updated_at on organizations
CREATE TRIGGER trigger_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Update updated_at on organization_members
CREATE TRIGGER trigger_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Update updated_at on organization_settings
CREATE TRIGGER trigger_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Update updated_at on billing_subscriptions
CREATE TRIGGER trigger_billing_subscriptions_updated_at
BEFORE UPDATE ON public.billing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Update updated_at on billing_usage
CREATE TRIGGER trigger_billing_usage_updated_at
BEFORE UPDATE ON public.billing_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- INITIAL DATA
-- Create default "Personal" organization for existing users
-- =====================================================

-- Insert default organization (run this after migration)
/*
INSERT INTO public.organizations (
    id,
    name,
    slug,
    display_name,
    description,
    status,
    current_plan
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Personal',
    'personal',
    'Personal Workspace',
    'Default organization for individual users',
    'active',
    'free'
) ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- COMMENTS
-- Add helpful comments to tables and columns
-- =====================================================

COMMENT ON TABLE public.organizations IS 'Root tenant table - each organization is an isolated tenant with complete data separation';
COMMENT ON TABLE public.organization_members IS 'User-to-organization mapping with roles and permissions';
COMMENT ON TABLE public.organization_settings IS 'Tenant-specific configuration with hierarchical settings';
COMMENT ON TABLE public.billing_subscriptions IS 'Stripe subscription tracking and management';
COMMENT ON TABLE public.billing_usage IS 'Usage metrics for billing calculations and limit enforcement';
COMMENT ON TABLE public.organization_audit_log IS 'Comprehensive audit trail for all organizational actions';

COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly unique identifier for the organization';
COMMENT ON COLUMN public.organizations.features IS 'JSONB object of feature flags: {"advanced_analytics": true, "custom_branding": false}';
COMMENT ON COLUMN public.organization_members.role IS 'Member role: owner (full control), admin (manage), member (regular), guest (limited)';
COMMENT ON COLUMN public.organization_members.custom_permissions IS 'Array of additional permissions beyond role: ["matter.delete", "billing.view"]';
COMMENT ON COLUMN public.organization_settings.is_inherited IS 'Whether this setting can be overridden by individual users';
COMMENT ON COLUMN public.billing_subscriptions.amount_cents IS 'Subscription amount stored in cents to avoid floating-point issues';
COMMENT ON COLUMN public.billing_usage.period_start IS 'Start of billing period for usage tracking';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Multi-Tenant Schema Migration Complete!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created tables:';
    RAISE NOTICE '  - organizations (root tenant table)';
    RAISE NOTICE '  - organization_members (user assignments)';
    RAISE NOTICE '  - organization_settings (tenant config)';
    RAISE NOTICE '  - billing_subscriptions (Stripe integration)';
    RAISE NOTICE '  - billing_usage (usage tracking)';
    RAISE NOTICE '  - organization_audit_log (audit trail)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Add organization_id to existing data tables';
    RAISE NOTICE '  2. Create default organization for testing';
    RAISE NOTICE '  3. Migrate existing users to organization_members';
    RAISE NOTICE '  4. Update JWT claims to include organization_id';
    RAISE NOTICE '  5. Test RLS policies thoroughly';
    RAISE NOTICE '==============================================';
END $$;
