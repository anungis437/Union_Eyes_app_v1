-- Migration: Strike Fund System (Adapted for existing schema, no PostGIS)
-- Description: Strike fund management with picket tracking and donations
-- Dependencies: Requires tenant_management.tenants
-- Version: 1.0.1
-- Date: 2025-11-16

-- ============================================================================
-- 1. STRIKE FUNDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.strike_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    
    fund_name VARCHAR(255) NOT NULL,
    fund_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    fund_type VARCHAR(50) NOT NULL CHECK (
        fund_type IN ('general', 'local', 'emergency', 'hardship')
    ),
    
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    target_amount DECIMAL(12,2),
    minimum_threshold DECIMAL(12,2),
    
    contribution_rate DECIMAL(10,2),
    contribution_frequency VARCHAR(20) CHECK (
        contribution_frequency IN ('weekly', 'monthly', 'quarterly', 'one_time')
    ),
    
    strike_status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (
        strike_status IN ('inactive', 'preparing', 'active', 'suspended', 'resolved')
    ),
    strike_start_date DATE,
    strike_end_date DATE,
    
    weekly_stipend_amount DECIMAL(10,2),
    daily_picket_bonus DECIMAL(8,2),
    minimum_attendance_hours DECIMAL(4,2) DEFAULT 4.0,
    
    estimated_burn_rate DECIMAL(10,2),
    estimated_duration_weeks INTEGER,
    fund_depletion_date DATE,
    last_prediction_update TIMESTAMP WITH TIME ZONE,
    
    accepts_public_donations BOOLEAN DEFAULT false,
    donation_page_url TEXT,
    fundraising_goal DECIMAL(12,2),
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_fund_code UNIQUE (tenant_id, fund_code),
    CONSTRAINT positive_balance CHECK (current_balance >= 0),
    CONSTRAINT valid_strike_dates CHECK (strike_end_date IS NULL OR strike_end_date > strike_start_date)
);

CREATE INDEX idx_strike_funds_tenant ON public.strike_funds(tenant_id);
CREATE INDEX idx_strike_funds_status ON public.strike_funds(tenant_id, strike_status);
CREATE INDEX idx_strike_funds_active ON public.strike_funds(tenant_id) WHERE strike_status = 'active';

-- ============================================================================
-- 2. FUND ELIGIBILITY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fund_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    is_eligible BOOLEAN DEFAULT false,
    eligibility_reason TEXT,
    
    months_in_good_standing INTEGER,
    has_paid_dues BOOLEAN DEFAULT false,
    no_arrears BOOLEAN DEFAULT false,
    is_in_bargaining_unit BOOLEAN DEFAULT false,
    
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (
        approval_status IN ('pending', 'approved', 'denied', 'under_review')
    ),
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_member_fund_eligibility UNIQUE (tenant_id, strike_fund_id, member_id)
);

CREATE INDEX idx_eligibility_tenant ON public.fund_eligibility(tenant_id);
CREATE INDEX idx_eligibility_fund ON public.fund_eligibility(strike_fund_id);
CREATE INDEX idx_eligibility_member ON public.fund_eligibility(member_id);

-- ============================================================================
-- 3. PICKET ATTENDANCE TABLE (without PostGIS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.picket_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    
    -- Location tracking (simple lat/long instead of PostGIS)
    check_in_latitude DECIMAL(10,8),
    check_in_longitude DECIMAL(11,8),
    check_out_latitude DECIMAL(10,8),
    check_out_longitude DECIMAL(11,8),
    location_verified BOOLEAN DEFAULT false,
    
    -- Check-in methods
    check_in_method VARCHAR(50) CHECK (
        check_in_method IN ('nfc', 'qr_code', 'gps', 'manual')
    ),
    nfc_tag_uid VARCHAR(100),
    qr_code_data VARCHAR(255),
    device_id TEXT,
    
    -- Duration tracking
    duration_minutes INTEGER,
    hours_worked DECIMAL(4,2),
    
    -- Approval
    coordinator_override BOOLEAN DEFAULT false,
    override_reason TEXT,
    verified_by TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attendance_tenant ON public.picket_attendance(tenant_id);
CREATE INDEX idx_attendance_fund ON public.picket_attendance(strike_fund_id);
CREATE INDEX idx_attendance_member ON public.picket_attendance(member_id);
CREATE INDEX idx_attendance_date ON public.picket_attendance(check_in_time);
CREATE INDEX idx_attendance_method ON public.picket_attendance(check_in_method);

-- ============================================================================
-- 4. STIPEND DISBURSEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stipend_disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    hours_worked DECIMAL(6,2) NOT NULL,
    base_stipend_amount DECIMAL(10,2) NOT NULL,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    
    status VARCHAR(50) NOT NULL DEFAULT 'calculated' CHECK (
        status IN ('calculated', 'approved', 'paid', 'cancelled')
    ),
    
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_member_week_stipend UNIQUE (tenant_id, strike_fund_id, member_id, week_start_date)
);

CREATE INDEX idx_stipends_tenant ON public.stipend_disbursements(tenant_id);
CREATE INDEX idx_stipends_fund ON public.stipend_disbursements(strike_fund_id);
CREATE INDEX idx_stipends_member ON public.stipend_disbursements(member_id);
CREATE INDEX idx_stipends_week ON public.stipend_disbursements(week_start_date);
CREATE INDEX idx_stipends_status ON public.stipend_disbursements(status);

-- ============================================================================
-- 5. PUBLIC DONATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.public_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    
    donor_name VARCHAR(255),
    donor_email VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT false,
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    payment_provider VARCHAR(50) DEFAULT 'stripe',
    payment_intent_id VARCHAR(255),
    transaction_id VARCHAR(255),
    
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')
    ),
    
    message TEXT,
    
    processed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donations_tenant ON public.public_donations(tenant_id);
CREATE INDEX idx_donations_fund ON public.public_donations(strike_fund_id);
CREATE INDEX idx_donations_status ON public.public_donations(status);
CREATE INDEX idx_donations_payment_intent ON public.public_donations(payment_intent_id);
CREATE INDEX idx_donations_created ON public.public_donations(created_at DESC);

-- ============================================================================
-- 6. HARDSHIP APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hardship_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hardship_type VARCHAR(50) NOT NULL CHECK (
        hardship_type IN ('medical', 'housing', 'utilities', 'childcare', 'other')
    ),
    
    amount_requested DECIMAL(10,2) NOT NULL,
    amount_approved DECIMAL(10,2),
    
    description TEXT NOT NULL,
    supporting_documents JSONB DEFAULT '[]',
    
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (
        status IN ('submitted', 'under_review', 'approved', 'denied', 'paid')
    ),
    
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    paid_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hardship_tenant ON public.hardship_applications(tenant_id);
CREATE INDEX idx_hardship_fund ON public.hardship_applications(strike_fund_id);
CREATE INDEX idx_hardship_member ON public.hardship_applications(member_id);
CREATE INDEX idx_hardship_status ON public.hardship_applications(status);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.strike_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picket_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stipend_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardship_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
CREATE POLICY "strike_funds_tenant_isolation" ON public.strike_funds
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "eligibility_tenant_isolation" ON public.fund_eligibility
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "attendance_tenant_isolation" ON public.picket_attendance
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "stipends_tenant_isolation" ON public.stipend_disbursements
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "donations_tenant_isolation" ON public.public_donations
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY "hardship_tenant_isolation" ON public.hardship_applications
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate weekly stipends
CREATE OR REPLACE FUNCTION calculate_weekly_stipend(
    p_fund_id UUID,
    p_member_id UUID,
    p_week_start DATE,
    p_week_end DATE
) RETURNS TABLE (
    hours_worked DECIMAL(6,2),
    base_amount DECIMAL(10,2),
    bonus_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_hours DECIMAL(6,2);
    v_base DECIMAL(10,2);
    v_bonus DECIMAL(10,2);
    v_weekly_stipend DECIMAL(10,2);
    v_daily_bonus DECIMAL(8,2);
    v_min_hours DECIMAL(4,2);
BEGIN
    -- Get fund configuration
    SELECT weekly_stipend_amount, daily_picket_bonus, minimum_attendance_hours
    INTO v_weekly_stipend, v_daily_bonus, v_min_hours
    FROM public.strike_funds
    WHERE id = p_fund_id;
    
    -- Calculate total hours
    SELECT COALESCE(SUM(pa.hours_worked), 0)
    INTO v_hours
    FROM public.picket_attendance pa
    WHERE pa.strike_fund_id = p_fund_id
        AND pa.member_id = p_member_id
        AND pa.check_in_time::date BETWEEN p_week_start AND p_week_end
        AND pa.check_out_time IS NOT NULL;
    
    -- Calculate base stipend (only if minimum hours met)
    IF v_hours >= v_min_hours THEN
        v_base := v_weekly_stipend;
    ELSE
        v_base := 0;
    END IF;
    
    -- Calculate bonus (per day with any attendance)
    SELECT v_daily_bonus * COUNT(DISTINCT pa.check_in_time::date)
    INTO v_bonus
    FROM public.picket_attendance pa
    WHERE pa.strike_fund_id = p_fund_id
        AND pa.member_id = p_member_id
        AND pa.check_in_time::date BETWEEN p_week_start AND p_week_end;
    
    RETURN QUERY SELECT v_hours, v_base, COALESCE(v_bonus, 0), v_base + COALESCE(v_bonus, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify location proximity (simple distance check)
CREATE OR REPLACE FUNCTION verify_location_proximity(
    p_check_lat DECIMAL(10,8),
    p_check_lon DECIMAL(11,8),
    p_target_lat DECIMAL(10,8),
    p_target_lon DECIMAL(11,8),
    p_max_distance_meters INTEGER DEFAULT 100
) RETURNS BOOLEAN AS $$
DECLARE
    v_distance_meters DECIMAL;
BEGIN
    -- Haversine formula approximation in meters
    v_distance_meters := 6371000 * acos(
        cos(radians(p_check_lat)) * cos(radians(p_target_lat)) *
        cos(radians(p_target_lon) - radians(p_check_lon)) +
        sin(radians(p_check_lat)) * sin(radians(p_target_lat))
    );
    
    RETURN v_distance_meters <= p_max_distance_meters;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_strike_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_strike_funds_timestamp
    BEFORE UPDATE ON public.strike_funds
    FOR EACH ROW
    EXECUTE FUNCTION update_strike_timestamps();

CREATE TRIGGER update_attendance_timestamp
    BEFORE UPDATE ON public.picket_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_strike_timestamps();

CREATE TRIGGER update_donations_timestamp
    BEFORE UPDATE ON public.public_donations
    FOR EACH ROW
    EXECUTE FUNCTION update_strike_timestamps();

-- Migration complete
SELECT 'Strike fund system migration completed successfully' AS status;
