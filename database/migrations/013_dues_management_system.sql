-- Migration: Dues Management System
-- Description: Complete financial governance system for union dues calculations, 
--              employer remittances, member payments, and arrears tracking
-- Dependencies: Requires existing tenants, members tables
-- Version: 1.0.0
-- Date: 2025-11-16

-- ============================================================================
-- 1. DUES RULES TABLE
-- ============================================================================
-- Stores calculation rules for different member categories and locals
CREATE TABLE IF NOT EXISTS public.dues_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Rule identification
    rule_name VARCHAR(255) NOT NULL,
    rule_code VARCHAR(50) NOT NULL, -- e.g., "LOCAL_123_REGULAR", "COPE_CONTRIBUTION"
    description TEXT,
    
    -- Rule configuration
    calculation_type VARCHAR(50) NOT NULL CHECK (
        calculation_type IN ('percentage', 'flat_rate', 'hourly', 'tiered', 'formula')
    ),
    
    -- Percentage-based calculations (e.g., 2.5% of gross wages)
    percentage_rate DECIMAL(5,2), -- e.g., 2.50 for 2.5%
    base_field VARCHAR(100), -- 'gross_wages', 'base_salary', 'hourly_rate'
    
    -- Flat rate calculations
    flat_amount DECIMAL(10,2), -- e.g., 25.00 for $25/month
    
    -- Hourly-based calculations
    hourly_rate DECIMAL(10,2),
    hours_per_period INTEGER,
    
    -- Tiered calculations (stored as JSONB)
    -- Format: [{"min": 0, "max": 50000, "rate": 2.5}, {"min": 50000, "max": null, "rate": 2.0}]
    tier_structure JSONB,
    
    -- Custom formula calculations (JavaScript-safe expressions)
    -- Example: "(gross_wages * 0.025) + (overtime_hours * 0.5)"
    custom_formula TEXT,
    
    -- Billing configuration
    billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (
        billing_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')
    ),
    
    -- Applicability rules
    member_category VARCHAR(100), -- 'full_time', 'part_time', 'retiree', 'apprentice'
    employment_status VARCHAR(50), -- 'active', 'on_leave', 'retired'
    local_number VARCHAR(20),
    department VARCHAR(100),
    
    -- Additional fees and assessments
    cope_contribution DECIMAL(10,2) DEFAULT 0.00,
    pac_contribution DECIMAL(10,2) DEFAULT 0.00,
    initiation_fee DECIMAL(10,2) DEFAULT 0.00,
    strike_fund_contribution DECIMAL(10,2) DEFAULT 0.00,
    
    -- Late payment configuration
    grace_period_days INTEGER DEFAULT 30,
    late_fee_type VARCHAR(20) DEFAULT 'percentage' CHECK (
        late_fee_type IN ('percentage', 'flat_amount', 'none')
    ),
    late_fee_amount DECIMAL(10,2) DEFAULT 0.00,
    late_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Rule lifecycle
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_rule_per_tenant UNIQUE (tenant_id, rule_code),
    CONSTRAINT valid_date_range CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT valid_calculation_params CHECK (
        (calculation_type = 'percentage' AND percentage_rate IS NOT NULL AND percentage_rate > 0) OR
        (calculation_type = 'flat_rate' AND flat_amount IS NOT NULL AND flat_amount > 0) OR
        (calculation_type = 'hourly' AND hourly_rate IS NOT NULL AND hourly_rate > 0) OR
        (calculation_type = 'tiered' AND tier_structure IS NOT NULL) OR
        (calculation_type = 'formula' AND custom_formula IS NOT NULL)
    )
);

-- Indexes for dues_rules
CREATE INDEX idx_dues_rules_tenant ON public.dues_rules(tenant_id);
CREATE INDEX idx_dues_rules_active ON public.dues_rules(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_dues_rules_effective_dates ON public.dues_rules(tenant_id, effective_from, effective_to);
CREATE INDEX idx_dues_rules_category ON public.dues_rules(tenant_id, member_category, employment_status);

-- ============================================================================
-- 2. MEMBER DUES ASSIGNMENTS TABLE
-- ============================================================================
-- Links members to specific dues rules
CREATE TABLE IF NOT EXISTS public.member_dues_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL, -- References members table
    dues_rule_id UUID NOT NULL REFERENCES public.dues_rules(id) ON DELETE RESTRICT,
    
    -- Assignment details
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Member-specific overrides
    override_amount DECIMAL(10,2), -- Manually override calculated amount
    override_reason TEXT,
    is_exempt BOOLEAN DEFAULT false,
    exemption_reason TEXT,
    
    -- Payment preferences
    payment_method VARCHAR(50) DEFAULT 'employer_remittance' CHECK (
        payment_method IN ('employer_remittance', 'direct_debit', 'credit_card', 'manual')
    ),
    
    -- Metadata
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_member_assignment UNIQUE (tenant_id, member_id, effective_from),
    CONSTRAINT valid_assignment_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Indexes for member_dues_assignments
CREATE INDEX idx_member_dues_tenant ON public.member_dues_assignments(tenant_id);
CREATE INDEX idx_member_dues_member ON public.member_dues_assignments(tenant_id, member_id);
CREATE INDEX idx_member_dues_rule ON public.member_dues_assignments(dues_rule_id);
CREATE INDEX idx_member_dues_active ON public.member_dues_assignments(tenant_id, member_id) 
    WHERE effective_to IS NULL OR effective_to > CURRENT_DATE;

-- ============================================================================
-- 3. DUES TRANSACTIONS TABLE
-- ============================================================================
-- Records all dues payments and adjustments
CREATE TABLE IF NOT EXISTS public.dues_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    dues_assignment_id UUID REFERENCES public.member_dues_assignments(id),
    
    -- Transaction identification
    transaction_number VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (
        transaction_type IN ('calculation', 'payment', 'adjustment', 'refund', 'write_off', 'late_fee')
    ),
    
    -- Billing period
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Amount breakdown
    base_dues_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cope_amount DECIMAL(10,2) DEFAULT 0.00,
    pac_amount DECIMAL(10,2) DEFAULT 0.00,
    strike_fund_amount DECIMAL(10,2) DEFAULT 0.00,
    late_fee_amount DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment details
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'paid', 'partial', 'failed', 'cancelled', 'refunded')
    ),
    payment_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255), -- Stripe payment ID, check number, etc.
    
    -- Calculation details (stored for audit trail)
    calculation_method VARCHAR(50),
    calculation_inputs JSONB, -- Store wage info, hours, etc.
    calculation_result JSONB, -- Detailed breakdown
    
    -- Related transactions
    parent_transaction_id UUID REFERENCES public.dues_transactions(id), -- For adjustments/refunds
    remittance_batch_id UUID, -- Link to employer remittance batch
    
    -- Notes and metadata
    description TEXT,
    notes TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_transaction_number UNIQUE (tenant_id, transaction_number),
    CONSTRAINT valid_billing_period CHECK (billing_period_end > billing_period_start),
    CONSTRAINT valid_total_amount CHECK (total_amount = base_dues_amount + cope_amount + pac_amount + 
                                         strike_fund_amount + late_fee_amount + adjustment_amount)
);

-- Indexes for dues_transactions
CREATE INDEX idx_dues_trans_tenant ON public.dues_transactions(tenant_id);
CREATE INDEX idx_dues_trans_member ON public.dues_transactions(tenant_id, member_id);
CREATE INDEX idx_dues_trans_status ON public.dues_transactions(tenant_id, payment_status);
CREATE INDEX idx_dues_trans_period ON public.dues_transactions(tenant_id, billing_period_start, billing_period_end);
CREATE INDEX idx_dues_trans_due_date ON public.dues_transactions(tenant_id, due_date) WHERE payment_status = 'pending';
CREATE INDEX idx_dues_trans_payment_date ON public.dues_transactions(payment_date) WHERE payment_date IS NOT NULL;
CREATE INDEX idx_dues_trans_remittance ON public.dues_transactions(remittance_batch_id) WHERE remittance_batch_id IS NOT NULL;

-- ============================================================================
-- 4. EMPLOYER REMITTANCES TABLE
-- ============================================================================
-- Tracks bulk payments from employers (check-off system)
CREATE TABLE IF NOT EXISTS public.employer_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Remittance identification
    remittance_number VARCHAR(50) NOT NULL,
    batch_reference VARCHAR(100), -- Employer's internal reference
    
    -- Employer details
    employer_name VARCHAR(255) NOT NULL,
    employer_id VARCHAR(100),
    local_number VARCHAR(20),
    
    -- Remittance period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    received_date DATE NOT NULL,
    
    -- Amount details
    total_remitted DECIMAL(12,2) NOT NULL,
    total_members INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    
    -- Payment details
    payment_method VARCHAR(50) CHECK (
        payment_method IN ('eft', 'wire_transfer', 'check', 'ach')
    ),
    payment_reference VARCHAR(255),
    bank_transaction_id VARCHAR(255),
    
    -- Processing status
    processing_status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (
        processing_status IN ('received', 'processing', 'matched', 'discrepancy', 'completed', 'rejected')
    ),
    
    -- Reconciliation
    expected_amount DECIMAL(12,2),
    variance_amount DECIMAL(12,2),
    variance_reason TEXT,
    reconciled_date DATE,
    reconciled_by UUID REFERENCES auth.users(id),
    
    -- Attached documents
    remittance_file_url TEXT, -- PDF/CSV from employer
    receipt_file_url TEXT,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_remittance_number UNIQUE (tenant_id, remittance_number),
    CONSTRAINT valid_remittance_period CHECK (period_end > period_start),
    CONSTRAINT positive_amounts CHECK (total_remitted > 0 AND total_members > 0)
);

-- Indexes for employer_remittances
CREATE INDEX idx_employer_rem_tenant ON public.employer_remittances(tenant_id);
CREATE INDEX idx_employer_rem_status ON public.employer_remittances(tenant_id, processing_status);
CREATE INDEX idx_employer_rem_employer ON public.employer_remittances(tenant_id, employer_name);
CREATE INDEX idx_employer_rem_period ON public.employer_remittances(tenant_id, period_start, period_end);
CREATE INDEX idx_employer_rem_received ON public.employer_remittances(received_date);

-- ============================================================================
-- 5. ARREARS CASES TABLE
-- ============================================================================
-- Tracks members with overdue dues and collection actions
CREATE TABLE IF NOT EXISTS public.arrears_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    -- Case identification
    case_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'payment_plan', 'legal', 'suspended', 'closed', 'written_off')
    ),
    severity VARCHAR(20) DEFAULT 'low' CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    
    -- Financial details
    total_arrears DECIMAL(10,2) NOT NULL,
    original_arrears DECIMAL(10,2) NOT NULL,
    months_in_arrears INTEGER DEFAULT 0,
    oldest_unpaid_date DATE,
    
    -- Payment plan (if applicable)
    has_payment_plan BOOLEAN DEFAULT false,
    payment_plan_amount DECIMAL(10,2),
    payment_plan_frequency VARCHAR(20),
    payment_plan_start_date DATE,
    payment_plan_end_date DATE,
    payments_made INTEGER DEFAULT 0,
    payments_missed INTEGER DEFAULT 0,
    
    -- Collection actions
    last_contact_date DATE,
    last_contact_method VARCHAR(50),
    next_action_date DATE,
    next_action_type VARCHAR(100),
    
    -- Legal proceedings
    legal_action_date DATE,
    legal_status VARCHAR(100),
    court_case_number VARCHAR(100),
    
    -- Suspension status
    membership_suspended BOOLEAN DEFAULT false,
    suspension_date DATE,
    voting_rights_suspended BOOLEAN DEFAULT false,
    
    -- Resolution
    resolved_date DATE,
    resolution_type VARCHAR(50), -- 'paid_full', 'payment_plan', 'written_off', 'bankruptcy'
    resolution_notes TEXT,
    
    -- Metadata
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id), -- Staff member handling case
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_arrears_case UNIQUE (tenant_id, case_number),
    CONSTRAINT positive_arrears CHECK (total_arrears >= 0),
    CONSTRAINT valid_payment_plan CHECK (
        (has_payment_plan = false) OR 
        (has_payment_plan = true AND payment_plan_amount IS NOT NULL AND 
         payment_plan_frequency IS NOT NULL AND payment_plan_start_date IS NOT NULL)
    )
);

-- Indexes for arrears_cases
CREATE INDEX idx_arrears_tenant ON public.arrears_cases(tenant_id);
CREATE INDEX idx_arrears_member ON public.arrears_cases(tenant_id, member_id);
CREATE INDEX idx_arrears_status ON public.arrears_cases(tenant_id, status) WHERE status IN ('open', 'payment_plan');
CREATE INDEX idx_arrears_severity ON public.arrears_cases(tenant_id, severity) WHERE status = 'open';
CREATE INDEX idx_arrears_next_action ON public.arrears_cases(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_arrears_suspended ON public.arrears_cases(tenant_id, membership_suspended) WHERE membership_suspended = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.dues_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_dues_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrears_cases ENABLE ROW LEVEL SECURITY;

-- Dues Rules Policies
CREATE POLICY "Users can view dues rules for their tenant"
    ON public.dues_rules FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can insert dues rules for their tenant"
    ON public.dues_rules FOR INSERT
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

CREATE POLICY "Admins can update dues rules for their tenant"
    ON public.dues_rules FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

CREATE POLICY "Admins can delete dues rules for their tenant"
    ON public.dues_rules FOR DELETE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') = 'admin'
    );

-- Member Dues Assignments Policies
CREATE POLICY "Users can view dues assignments for their tenant"
    ON public.member_dues_assignments FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can manage dues assignments for their tenant"
    ON public.member_dues_assignments FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

-- Dues Transactions Policies
CREATE POLICY "Users can view dues transactions for their tenant"
    ON public.dues_transactions FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "System can insert dues transactions for tenant"
    ON public.dues_transactions FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can update dues transactions for their tenant"
    ON public.dues_transactions FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

-- Employer Remittances Policies
CREATE POLICY "Users can view remittances for their tenant"
    ON public.employer_remittances FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Financial admins can manage remittances for their tenant"
    ON public.employer_remittances FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

-- Arrears Cases Policies
CREATE POLICY "Users can view arrears cases for their tenant"
    ON public.arrears_cases FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can manage arrears cases for their tenant"
    ON public.arrears_cases FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

-- ============================================================================
-- AUDIT LOGGING TRIGGERS
-- ============================================================================

-- Create audit log function for financial transactions
CREATE OR REPLACE FUNCTION log_dues_transaction_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        changes,
        ip_address,
        user_agent
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        current_setting('app.current_user_id')::uuid,
        TG_OP,
        'dues_transaction',
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            )
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            ELSE row_to_json(NEW)::jsonb
        END,
        inet_client_addr()::text,
        current_setting('app.user_agent', true)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_dues_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.dues_transactions
    FOR EACH ROW EXECUTE FUNCTION log_dues_transaction_audit();

CREATE TRIGGER audit_employer_remittances
    AFTER INSERT OR UPDATE OR DELETE ON public.employer_remittances
    FOR EACH ROW EXECUTE FUNCTION log_dues_transaction_audit();

CREATE TRIGGER audit_arrears_cases
    AFTER INSERT OR UPDATE OR DELETE ON public.arrears_cases
    FOR EACH ROW EXECUTE FUNCTION log_dues_transaction_audit();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate current arrears for a member
CREATE OR REPLACE FUNCTION calculate_member_arrears(p_tenant_id UUID, p_member_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_arrears DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total_amount), 0)
    INTO total_arrears
    FROM public.dues_transactions
    WHERE tenant_id = p_tenant_id
      AND member_id = p_member_id
      AND payment_status IN ('pending', 'failed')
      AND due_date < CURRENT_DATE;
    
    RETURN total_arrears;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active dues rule for a member
CREATE OR REPLACE FUNCTION get_active_dues_rule(p_tenant_id UUID, p_member_id UUID)
RETURNS UUID AS $$
DECLARE
    rule_id UUID;
BEGIN
    SELECT dues_rule_id
    INTO rule_id
    FROM public.member_dues_assignments
    WHERE tenant_id = p_tenant_id
      AND member_id = p_member_id
      AND effective_from <= CURRENT_DATE
      AND (effective_to IS NULL OR effective_to > CURRENT_DATE)
    ORDER BY effective_from DESC
    LIMIT 1;
    
    RETURN rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MATERIALIZED VIEW: Monthly Dues Summary
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_dues_summary AS
SELECT
    t.tenant_id,
    DATE_TRUNC('month', t.billing_period_start) AS month,
    COUNT(DISTINCT t.member_id) AS total_members,
    COUNT(*) AS total_transactions,
    SUM(t.base_dues_amount) AS total_base_dues,
    SUM(t.cope_amount) AS total_cope,
    SUM(t.pac_amount) AS total_pac,
    SUM(t.strike_fund_amount) AS total_strike_fund,
    SUM(t.late_fee_amount) AS total_late_fees,
    SUM(t.total_amount) AS total_revenue,
    COUNT(*) FILTER (WHERE t.payment_status = 'paid') AS paid_count,
    COUNT(*) FILTER (WHERE t.payment_status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE t.payment_status = 'failed') AS failed_count,
    SUM(t.total_amount) FILTER (WHERE t.payment_status = 'paid') AS collected_amount,
    SUM(t.total_amount) FILTER (WHERE t.payment_status IN ('pending', 'failed')) AS outstanding_amount
FROM public.dues_transactions t
GROUP BY t.tenant_id, DATE_TRUNC('month', t.billing_period_start);

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_mv_monthly_dues_tenant_month ON mv_monthly_dues_summary(tenant_id, month);
CREATE INDEX idx_mv_monthly_dues_month ON mv_monthly_dues_summary(month DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.dues_rules IS 'Defines calculation rules for member dues based on wages, employment type, and local agreements';
COMMENT ON TABLE public.member_dues_assignments IS 'Links members to their applicable dues rules with effective dates and overrides';
COMMENT ON TABLE public.dues_transactions IS 'Records all dues calculations, payments, adjustments, and refunds with full audit trail';
COMMENT ON TABLE public.employer_remittances IS 'Tracks bulk dues payments received from employers via check-off agreements';
COMMENT ON TABLE public.arrears_cases IS 'Manages collection efforts for members with overdue dues including payment plans and legal actions';
COMMENT ON MATERIALIZED VIEW mv_monthly_dues_summary IS 'Aggregated monthly financial summary for reporting and analytics';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To refresh the materialized view, run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_dues_summary;
