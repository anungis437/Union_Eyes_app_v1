-- Migration: Dues Management System (Adapted for existing schema)
-- Description: Complete financial governance system for union dues calculations
-- Dependencies: Requires tenant_management.tenants
-- Version: 1.0.1
-- Date: 2025-11-16

-- ============================================================================
-- 1. DUES RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dues_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    
    rule_name VARCHAR(255) NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    calculation_type VARCHAR(50) NOT NULL CHECK (
        calculation_type IN ('percentage', 'flat_rate', 'hourly', 'tiered', 'formula')
    ),
    
    percentage_rate DECIMAL(5,2),
    base_field VARCHAR(100),
    flat_amount DECIMAL(10,2),
    hourly_rate DECIMAL(10,2),
    hours_per_period INTEGER,
    tier_structure JSONB,
    custom_formula TEXT,
    
    billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (
        billing_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')
    ),
    
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_rule_code UNIQUE (tenant_id, rule_code)
);

CREATE INDEX idx_dues_rules_tenant ON public.dues_rules(tenant_id);
CREATE INDEX idx_dues_rules_active ON public.dues_rules(tenant_id, is_active);

-- ============================================================================
-- 2. MEMBER DUES ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.member_dues_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    rule_id UUID NOT NULL REFERENCES public.dues_rules(id) ON DELETE CASCADE,
    
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    override_amount DECIMAL(10,2),
    override_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_active_assignment UNIQUE (tenant_id, member_id, rule_id, effective_date)
);

CREATE INDEX idx_assignments_tenant ON public.member_dues_assignments(tenant_id);
CREATE INDEX idx_assignments_member ON public.member_dues_assignments(member_id);
CREATE INDEX idx_assignments_active ON public.member_dues_assignments(tenant_id, is_active);

-- ============================================================================
-- 3. DUES TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dues_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    assignment_id UUID REFERENCES public.member_dues_assignments(id),
    rule_id UUID REFERENCES public.dues_rules(id),
    
    transaction_type VARCHAR(50) NOT NULL CHECK (
        transaction_type IN ('charge', 'payment', 'adjustment', 'refund', 'waiver', 'late_fee')
    ),
    
    amount DECIMAL(10,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'partial', 'overdue', 'waived', 'refunded', 'cancelled')
    ),
    
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON public.dues_transactions(tenant_id);
CREATE INDEX idx_transactions_member ON public.dues_transactions(member_id);
CREATE INDEX idx_transactions_status ON public.dues_transactions(tenant_id, status);
CREATE INDEX idx_transactions_due_date ON public.dues_transactions(due_date);
CREATE INDEX idx_transactions_period ON public.dues_transactions(period_start, period_end);

-- ============================================================================
-- 4. EMPLOYER REMITTANCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employer_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    
    employer_name VARCHAR(255) NOT NULL,
    employer_id VARCHAR(100),
    remittance_period_start DATE NOT NULL,
    remittance_period_end DATE NOT NULL,
    remittance_date DATE NOT NULL,
    
    total_amount DECIMAL(12,2) NOT NULL,
    member_count INTEGER NOT NULL,
    
    file_url TEXT,
    file_hash VARCHAR(64),
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'reconciled', 'partial', 'discrepancy')
    ),
    
    reconciliation_status VARCHAR(50),
    reconciliation_date TIMESTAMP WITH TIME ZONE,
    reconciled_by TEXT,
    
    variance_amount DECIMAL(10,2) DEFAULT 0.00,
    variance_reason TEXT,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_remittances_tenant ON public.employer_remittances(tenant_id);
CREATE INDEX idx_remittances_period ON public.employer_remittances(remittance_period_start, remittance_period_end);
CREATE INDEX idx_remittances_status ON public.employer_remittances(tenant_id, status);

-- ============================================================================
-- 5. ARREARS CASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.arrears_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    case_number VARCHAR(100) UNIQUE,
    total_owed DECIMAL(10,2) NOT NULL,
    oldest_debt_date DATE,
    
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'payment_plan', 'collections', 'legal', 'resolved', 'written_off')
    ),
    
    payment_plan_id UUID,
    payment_plan_amount DECIMAL(10,2),
    payment_plan_frequency VARCHAR(20),
    
    last_contact_date TIMESTAMP WITH TIME ZONE,
    last_contact_method VARCHAR(50),
    next_followup_date DATE,
    
    escalation_level INTEGER DEFAULT 0,
    escalation_history JSONB DEFAULT '[]',
    
    resolution_date TIMESTAMP WITH TIME ZONE,
    resolution_type VARCHAR(50),
    resolution_notes TEXT,
    
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_arrears_tenant ON public.arrears_cases(tenant_id);
CREATE INDEX idx_arrears_member ON public.arrears_cases(member_id);
CREATE INDEX idx_arrears_status ON public.arrears_cases(tenant_id, status);
CREATE INDEX idx_arrears_followup ON public.arrears_cases(next_followup_date) WHERE status = 'open';

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.dues_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_dues_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrears_cases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (Tenant Isolation)
-- ============================================================================
CREATE POLICY "dues_rules_tenant_isolation" ON public.dues_rules
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "assignments_tenant_isolation" ON public.member_dues_assignments
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "transactions_tenant_isolation" ON public.dues_transactions
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "remittances_tenant_isolation" ON public.employer_remittances
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "arrears_tenant_isolation" ON public.arrears_cases
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function to calculate late fees
CREATE OR REPLACE FUNCTION calculate_late_fees()
RETURNS TABLE (
    transaction_id UUID,
    late_fee_amount DECIMAL(10,2),
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        CASE 
            WHEN CURRENT_DATE - t.due_date > 7 THEN t.amount * 0.05
            ELSE 0.00
        END::DECIMAL(10,2),
        (CURRENT_DATE - t.due_date)::INTEGER
    FROM public.dues_transactions t
    WHERE t.status = 'overdue'
        AND t.due_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dues_transactions_timestamp
    BEFORE UPDATE ON public.dues_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_timestamps();

CREATE TRIGGER update_employer_remittances_timestamp
    BEFORE UPDATE ON public.employer_remittances
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_timestamps();

CREATE TRIGGER update_arrears_cases_timestamp
    BEFORE UPDATE ON public.arrears_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_timestamps();

-- Migration complete
SELECT 'Dues management system migration completed successfully' AS status;
