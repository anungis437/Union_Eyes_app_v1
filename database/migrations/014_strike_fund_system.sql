-- Migration: Strike Fund System
-- Description: Complete strike readiness infrastructure including fund management,
--              picket attendance tracking (NFC/GPS), stipend disbursements,
--              public donations, and hardship assistance
-- Dependencies: Requires PostGIS extension for geospatial features
-- Version: 1.0.0
-- Date: 2025-11-16

-- ============================================================================
-- ENABLE POSTGIS EXTENSION (if not already enabled)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- 1. STRIKE FUNDS TABLE
-- ============================================================================
-- Master table for strike fund management
CREATE TABLE IF NOT EXISTS public.strike_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Fund identification
    fund_name VARCHAR(255) NOT NULL,
    fund_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Fund type
    fund_type VARCHAR(50) NOT NULL CHECK (
        fund_type IN ('general', 'local', 'emergency', 'hardship')
    ),
    
    -- Financial tracking
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    target_amount DECIMAL(12,2),
    minimum_threshold DECIMAL(12,2),
    
    -- Contribution rules
    contribution_rate DECIMAL(10,2), -- Per member per period
    contribution_frequency VARCHAR(20) CHECK (
        contribution_frequency IN ('weekly', 'monthly', 'quarterly', 'one_time')
    ),
    
    -- Strike status
    strike_status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (
        strike_status IN ('inactive', 'preparing', 'active', 'suspended', 'resolved')
    ),
    strike_start_date DATE,
    strike_end_date DATE,
    
    -- Disbursement configuration
    weekly_stipend_amount DECIMAL(10,2),
    daily_picket_bonus DECIMAL(8,2),
    minimum_attendance_hours DECIMAL(4,2) DEFAULT 4.0,
    
    -- AI predictions
    estimated_burn_rate DECIMAL(10,2), -- Weekly estimated disbursements
    estimated_duration_weeks INTEGER,
    fund_depletion_date DATE,
    last_prediction_update TIMESTAMP WITH TIME ZONE,
    
    -- Public fundraising
    accepts_public_donations BOOLEAN DEFAULT false,
    donation_page_url TEXT,
    fundraising_goal DECIMAL(12,2),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_fund_code UNIQUE (tenant_id, fund_code),
    CONSTRAINT positive_balance CHECK (current_balance >= 0),
    CONSTRAINT valid_strike_dates CHECK (strike_end_date IS NULL OR strike_end_date > strike_start_date)
);

-- Indexes for strike_funds
CREATE INDEX idx_strike_funds_tenant ON public.strike_funds(tenant_id);
CREATE INDEX idx_strike_funds_status ON public.strike_funds(tenant_id, strike_status);
CREATE INDEX idx_strike_funds_active ON public.strike_funds(tenant_id) WHERE strike_status = 'active';

-- ============================================================================
-- 2. FUND ELIGIBILITY TABLE
-- ============================================================================
-- Tracks member eligibility for strike fund benefits
CREATE TABLE IF NOT EXISTS public.fund_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    -- Eligibility status
    is_eligible BOOLEAN DEFAULT false,
    eligibility_reason TEXT,
    
    -- Qualifying criteria
    months_in_good_standing INTEGER,
    has_paid_dues BOOLEAN DEFAULT false,
    no_arrears BOOLEAN DEFAULT false,
    is_in_bargaining_unit BOOLEAN DEFAULT false,
    
    -- Participation requirements
    required_picket_hours_per_week DECIMAL(4,2) DEFAULT 20.0,
    required_meetings_attended INTEGER DEFAULT 0,
    
    -- Benefit entitlements
    weekly_stipend_eligible BOOLEAN DEFAULT false,
    hardship_assistance_eligible BOOLEAN DEFAULT false,
    
    -- Effective dates
    eligible_from DATE,
    eligible_to DATE,
    
    -- Review information
    last_reviewed_date DATE,
    reviewed_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_member_fund_eligibility UNIQUE (tenant_id, strike_fund_id, member_id)
);

-- Indexes for fund_eligibility
CREATE INDEX idx_fund_eligibility_tenant ON public.fund_eligibility(tenant_id);
CREATE INDEX idx_fund_eligibility_fund ON public.fund_eligibility(strike_fund_id);
CREATE INDEX idx_fund_eligibility_member ON public.fund_eligibility(tenant_id, member_id);
CREATE INDEX idx_fund_eligibility_eligible ON public.fund_eligibility(tenant_id, is_eligible) WHERE is_eligible = true;

-- ============================================================================
-- 3. PICKET ATTENDANCE TABLE
-- ============================================================================
-- Records picket line attendance with GPS verification
CREATE TABLE IF NOT EXISTS public.picket_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    -- Attendance identification
    attendance_date DATE NOT NULL,
    shift_type VARCHAR(50) CHECK (
        shift_type IN ('morning', 'afternoon', 'evening', 'overnight', 'custom')
    ),
    
    -- Time tracking
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(4,2),
    
    -- Check-in method
    check_in_method VARCHAR(50) NOT NULL CHECK (
        check_in_method IN ('nfc', 'qr_code', 'gps', 'manual')
    ),
    
    -- Geospatial data (PostGIS geometry type)
    check_in_location GEOGRAPHY(POINT, 4326), -- GPS coordinates
    check_out_location GEOGRAPHY(POINT, 4326),
    picket_line_location GEOGRAPHY(POINT, 4326), -- Designated picket location
    
    -- Location verification
    location_verified BOOLEAN DEFAULT false,
    distance_from_picket_line DECIMAL(8,2), -- Meters
    within_geofence BOOLEAN DEFAULT false, -- Within 100m radius
    
    -- Device information
    device_id VARCHAR(255), -- NFC reader ID or mobile device ID
    nfc_tag_uid VARCHAR(100),
    qr_code_token VARCHAR(255),
    
    -- Attendance validation
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        verification_status IN ('pending', 'verified', 'disputed', 'rejected', 'manual_override')
    ),
    verified_by UUID REFERENCES auth.users(id),
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Weather conditions (optional, for records)
    weather_conditions VARCHAR(100),
    temperature_celsius DECIMAL(4,1),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_check_times CHECK (check_out_time IS NULL OR check_out_time > check_in_time),
    CONSTRAINT valid_hours CHECK (total_hours IS NULL OR (total_hours >= 0 AND total_hours <= 24))
);

-- Indexes for picket_attendance
CREATE INDEX idx_picket_attendance_tenant ON public.picket_attendance(tenant_id);
CREATE INDEX idx_picket_attendance_fund ON public.picket_attendance(strike_fund_id);
CREATE INDEX idx_picket_attendance_member ON public.picket_attendance(tenant_id, member_id);
CREATE INDEX idx_picket_attendance_date ON public.picket_attendance(attendance_date DESC);
CREATE INDEX idx_picket_attendance_status ON public.picket_attendance(verification_status) WHERE verification_status = 'pending';

-- Spatial index for geospatial queries
CREATE INDEX idx_picket_check_in_location ON public.picket_attendance USING GIST(check_in_location);
CREATE INDEX idx_picket_line_location ON public.picket_attendance USING GIST(picket_line_location);

-- ============================================================================
-- 4. STIPEND DISBURSEMENTS TABLE
-- ============================================================================
-- Tracks weekly stipend payments to striking members
CREATE TABLE IF NOT EXISTS public.stipend_disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    -- Disbursement identification
    disbursement_number VARCHAR(50) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    -- Attendance summary
    total_picket_hours DECIMAL(5,2) NOT NULL,
    total_picket_days INTEGER NOT NULL,
    attendance_percentage DECIMAL(5,2), -- % of required hours
    
    -- Amount calculation
    base_stipend_amount DECIMAL(10,2) NOT NULL,
    picket_bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Calculation details
    calculation_method VARCHAR(50),
    calculation_details JSONB, -- Store hours breakdown, bonuses applied
    
    -- Payment status
    payment_status VARCHAR(50) NOT NULL DEFAULT 'calculated' CHECK (
        payment_status IN ('calculated', 'approved', 'processing', 'paid', 'failed', 'cancelled', 'held')
    ),
    approved_by UUID REFERENCES auth.users(id),
    approved_date DATE,
    
    -- Payment details
    payment_method VARCHAR(50) CHECK (
        payment_method IN ('direct_deposit', 'check', 'e_transfer', 'cash', 'paypal')
    ),
    payment_reference VARCHAR(255), -- Bank transaction ID, check number, etc.
    payment_date DATE,
    
    -- Holds and restrictions
    hold_reason TEXT,
    held_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_disbursement_number UNIQUE (tenant_id, disbursement_number),
    CONSTRAINT unique_member_week UNIQUE (tenant_id, strike_fund_id, member_id, week_start_date),
    CONSTRAINT valid_week_dates CHECK (week_end_date > week_start_date),
    CONSTRAINT positive_hours CHECK (total_picket_hours >= 0),
    CONSTRAINT valid_total_amount CHECK (total_amount = base_stipend_amount + picket_bonus_amount + adjustment_amount)
);

-- Indexes for stipend_disbursements
CREATE INDEX idx_stipend_disbursements_tenant ON public.stipend_disbursements(tenant_id);
CREATE INDEX idx_stipend_disbursements_fund ON public.stipend_disbursements(strike_fund_id);
CREATE INDEX idx_stipend_disbursements_member ON public.stipend_disbursements(tenant_id, member_id);
CREATE INDEX idx_stipend_disbursements_status ON public.stipend_disbursements(payment_status);
CREATE INDEX idx_stipend_disbursements_week ON public.stipend_disbursements(week_start_date, week_end_date);

-- ============================================================================
-- 5. PUBLIC DONATIONS TABLE
-- ============================================================================
-- Tracks public donations to strike funds
CREATE TABLE IF NOT EXISTS public.public_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    
    -- Donation identification
    donation_number VARCHAR(50) NOT NULL,
    donation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Donor information (optional for anonymous donations)
    donor_name VARCHAR(255),
    donor_email VARCHAR(255),
    donor_phone VARCHAR(20),
    donor_address TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    
    -- Organization donations
    is_organization BOOLEAN DEFAULT false,
    organization_name VARCHAR(255),
    organization_type VARCHAR(100), -- 'labor_union', 'nonprofit', 'business', 'other'
    
    -- Donation amount
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    
    -- Payment details
    payment_method VARCHAR(50) CHECK (
        payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'check', 'cash', 'crypto')
    ),
    payment_processor VARCHAR(50), -- 'stripe', 'paypal', 'square'
    payment_reference VARCHAR(255), -- Transaction ID
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')
    ),
    
    -- Recurring donations
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20), -- 'weekly', 'monthly'
    recurring_end_date DATE,
    
    -- Receipt information
    receipt_required BOOLEAN DEFAULT true,
    receipt_issued BOOLEAN DEFAULT false,
    receipt_number VARCHAR(50),
    receipt_issued_date DATE,
    tax_receipt_eligible BOOLEAN DEFAULT false, -- For registered charities
    
    -- Communication preferences
    send_updates BOOLEAN DEFAULT false,
    consent_to_contact BOOLEAN DEFAULT false,
    
    -- Campaign tracking
    campaign_source VARCHAR(100), -- 'website', 'social_media', 'email', 'event'
    referral_code VARCHAR(50),
    
    -- Metadata
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_donation_number UNIQUE (tenant_id, donation_number),
    CONSTRAINT positive_donation_amount CHECK (amount > 0),
    CONSTRAINT donor_info_if_not_anonymous CHECK (
        is_anonymous = true OR (donor_name IS NOT NULL OR organization_name IS NOT NULL)
    )
);

-- Indexes for public_donations
CREATE INDEX idx_donations_tenant ON public.public_donations(tenant_id);
CREATE INDEX idx_donations_fund ON public.public_donations(strike_fund_id);
CREATE INDEX idx_donations_date ON public.public_donations(donation_date DESC);
CREATE INDEX idx_donations_status ON public.public_donations(payment_status);
CREATE INDEX idx_donations_recurring ON public.public_donations(tenant_id, is_recurring) WHERE is_recurring = true;
CREATE INDEX idx_donations_campaign ON public.public_donations(campaign_source, donation_date);

-- ============================================================================
-- 6. HARDSHIP APPLICATIONS TABLE
-- ============================================================================
-- Tracks emergency financial assistance applications
CREATE TABLE IF NOT EXISTS public.hardship_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    strike_fund_id UUID NOT NULL REFERENCES public.strike_funds(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    
    -- Application identification
    application_number VARCHAR(50) NOT NULL,
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Hardship type
    hardship_type VARCHAR(100) NOT NULL CHECK (
        hardship_type IN ('medical', 'housing', 'utilities', 'childcare', 'transportation', 
                          'food', 'debt_relief', 'other')
    ),
    urgency_level VARCHAR(20) DEFAULT 'medium' CHECK (
        urgency_level IN ('low', 'medium', 'high', 'critical')
    ),
    
    -- Financial details
    amount_requested DECIMAL(10,2) NOT NULL,
    amount_approved DECIMAL(10,2),
    justification TEXT NOT NULL,
    
    -- Household information
    household_size INTEGER,
    dependents INTEGER,
    monthly_household_income DECIMAL(10,2),
    monthly_expenses DECIMAL(10,2),
    
    -- Supporting documentation
    documents_submitted JSONB, -- Array of document URLs/references
    verification_required BOOLEAN DEFAULT true,
    verification_completed BOOLEAN DEFAULT false,
    
    -- Application status
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (
        status IN ('submitted', 'under_review', 'additional_info_needed', 
                   'approved', 'partially_approved', 'denied', 'withdrawn', 'paid')
    ),
    
    -- Review process
    reviewed_by UUID REFERENCES auth.users(id),
    review_date DATE,
    review_notes TEXT,
    denial_reason TEXT,
    
    -- Approval workflow
    requires_committee_approval BOOLEAN DEFAULT false,
    committee_decision_date DATE,
    committee_notes TEXT,
    
    -- Payment information
    payment_status VARCHAR(50) CHECK (
        payment_status IN ('not_paid', 'scheduled', 'paid', 'failed')
    ),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    payment_date DATE,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_application_number UNIQUE (tenant_id, application_number),
    CONSTRAINT positive_requested_amount CHECK (amount_requested > 0),
    CONSTRAINT valid_approved_amount CHECK (amount_approved IS NULL OR amount_approved <= amount_requested)
);

-- Indexes for hardship_applications
CREATE INDEX idx_hardship_apps_tenant ON public.hardship_applications(tenant_id);
CREATE INDEX idx_hardship_apps_fund ON public.hardship_applications(strike_fund_id);
CREATE INDEX idx_hardship_apps_member ON public.hardship_applications(tenant_id, member_id);
CREATE INDEX idx_hardship_apps_status ON public.hardship_applications(tenant_id, status);
CREATE INDEX idx_hardship_apps_urgency ON public.hardship_applications(urgency_level, application_date) 
    WHERE status IN ('submitted', 'under_review');
CREATE INDEX idx_hardship_apps_review ON public.hardship_applications(status) 
    WHERE status IN ('submitted', 'under_review');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.strike_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picket_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stipend_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardship_applications ENABLE ROW LEVEL SECURITY;

-- Strike Funds Policies
CREATE POLICY "Users can view strike funds for their tenant"
    ON public.strike_funds FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can manage strike funds for their tenant"
    ON public.strike_funds FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin', 'strike_coordinator')
    );

-- Fund Eligibility Policies
CREATE POLICY "Users can view eligibility for their tenant"
    ON public.fund_eligibility FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Strike coordinators can manage eligibility"
    ON public.fund_eligibility FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'strike_coordinator')
    );

-- Picket Attendance Policies
CREATE POLICY "Users can view picket attendance for their tenant"
    ON public.picket_attendance FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Members can check in to picket lines"
    ON public.picket_attendance FOR INSERT
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        member_id = current_setting('app.current_user_id')::uuid
    );

CREATE POLICY "Strike coordinators can manage attendance"
    ON public.picket_attendance FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'strike_coordinator')
    );

-- Stipend Disbursements Policies
CREATE POLICY "Users can view disbursements for their tenant"
    ON public.stipend_disbursements FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Financial admins can manage disbursements"
    ON public.stipend_disbursements FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin', 'strike_coordinator')
    );

-- Public Donations Policies (more permissive for public access)
CREATE POLICY "Anyone can insert donations"
    ON public.public_donations FOR INSERT
    WITH CHECK (true); -- Public donations allowed from anyone

CREATE POLICY "Users can view donations for their tenant"
    ON public.public_donations FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Admins can manage donations for their tenant"
    ON public.public_donations FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'financial_admin')
    );

-- Hardship Applications Policies
CREATE POLICY "Members can view their own applications"
    ON public.hardship_applications FOR SELECT
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        (member_id = current_setting('app.current_user_id')::uuid OR
         current_setting('app.user_role') IN ('admin', 'strike_coordinator'))
    );

CREATE POLICY "Members can submit applications"
    ON public.hardship_applications FOR INSERT
    WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        member_id = current_setting('app.current_user_id')::uuid
    );

CREATE POLICY "Strike coordinators can manage applications"
    ON public.hardship_applications FOR UPDATE
    USING (
        tenant_id = current_setting('app.current_tenant_id')::uuid AND
        current_setting('app.user_role') IN ('admin', 'strike_coordinator')
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two GPS points (in meters)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
)
RETURNS DECIMAL(8,2) AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to verify picket attendance within geofence
CREATE OR REPLACE FUNCTION verify_picket_location(
    p_attendance_id UUID,
    p_max_distance_meters DECIMAL DEFAULT 100.0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_distance DECIMAL(8,2);
    v_within_geofence BOOLEAN;
BEGIN
    SELECT 
        ST_Distance(check_in_location, picket_line_location),
        ST_DWithin(check_in_location, picket_line_location, p_max_distance_meters)
    INTO v_distance, v_within_geofence
    FROM public.picket_attendance
    WHERE id = p_attendance_id;
    
    -- Update the attendance record
    UPDATE public.picket_attendance
    SET 
        distance_from_picket_line = v_distance,
        within_geofence = v_within_geofence,
        location_verified = v_within_geofence,
        verification_status = CASE WHEN v_within_geofence THEN 'verified' ELSE 'disputed' END
    WHERE id = p_attendance_id;
    
    RETURN v_within_geofence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate weekly stipend based on attendance
CREATE OR REPLACE FUNCTION calculate_weekly_stipend(
    p_strike_fund_id UUID,
    p_member_id UUID,
    p_week_start DATE
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_total_hours DECIMAL(5,2);
    v_total_days INTEGER;
    v_base_stipend DECIMAL(10,2);
    v_picket_bonus DECIMAL(10,2);
    v_daily_bonus DECIMAL(8,2);
    v_min_hours DECIMAL(4,2);
BEGIN
    -- Get strike fund configuration
    SELECT weekly_stipend_amount, daily_picket_bonus, minimum_attendance_hours
    INTO v_base_stipend, v_daily_bonus, v_min_hours
    FROM public.strike_funds
    WHERE id = p_strike_fund_id;
    
    -- Calculate attendance for the week
    SELECT 
        COALESCE(SUM(total_hours), 0),
        COUNT(DISTINCT attendance_date)
    INTO v_total_hours, v_total_days
    FROM public.picket_attendance
    WHERE strike_fund_id = p_strike_fund_id
      AND member_id = p_member_id
      AND attendance_date >= p_week_start
      AND attendance_date < p_week_start + INTERVAL '7 days'
      AND verification_status = 'verified'
      AND total_hours >= v_min_hours;
    
    -- Calculate picket bonus
    v_picket_bonus := v_total_days * v_daily_bonus;
    
    -- Build result
    v_result := jsonb_build_object(
        'total_hours', v_total_hours,
        'total_days', v_total_days,
        'base_stipend', v_base_stipend,
        'picket_bonus', v_picket_bonus,
        'total_amount', v_base_stipend + v_picket_bonus,
        'meets_minimum_hours', v_total_hours >= (v_min_hours * 5) -- 5 days minimum
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update strike fund balance
CREATE OR REPLACE FUNCTION update_strike_fund_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add donation to fund balance
        IF TG_TABLE_NAME = 'public_donations' AND NEW.payment_status = 'completed' THEN
            UPDATE public.strike_funds
            SET current_balance = current_balance + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.strike_fund_id;
        END IF;
        
        -- Deduct disbursement from fund balance
        IF TG_TABLE_NAME = 'stipend_disbursements' AND NEW.payment_status = 'paid' THEN
            UPDATE public.strike_funds
            SET current_balance = current_balance - NEW.total_amount,
                updated_at = NOW()
            WHERE id = NEW.strike_fund_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply balance update trigger
CREATE TRIGGER update_fund_balance_on_donation
    AFTER INSERT OR UPDATE ON public.public_donations
    FOR EACH ROW EXECUTE FUNCTION update_strike_fund_balance();

CREATE TRIGGER update_fund_balance_on_disbursement
    AFTER INSERT OR UPDATE ON public.stipend_disbursements
    FOR EACH ROW EXECUTE FUNCTION update_strike_fund_balance();

-- ============================================================================
-- MATERIALIZED VIEW: Weekly Strike Fund Summary
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_strike_summary AS
SELECT
    sf.id AS strike_fund_id,
    sf.tenant_id,
    DATE_TRUNC('week', pa.attendance_date)::DATE AS week_start,
    COUNT(DISTINCT pa.member_id) AS active_members,
    COUNT(pa.id) AS total_check_ins,
    SUM(pa.total_hours) AS total_picket_hours,
    AVG(pa.total_hours) AS avg_hours_per_member,
    COUNT(*) FILTER (WHERE pa.verification_status = 'verified') AS verified_check_ins,
    COUNT(*) FILTER (WHERE pa.verification_status = 'pending') AS pending_verification,
    SUM(sd.total_amount) AS total_stipends_paid,
    sf.current_balance AS fund_balance,
    sf.estimated_burn_rate
FROM public.strike_funds sf
LEFT JOIN public.picket_attendance pa ON sf.id = pa.strike_fund_id
LEFT JOIN public.stipend_disbursements sd ON sf.id = sd.strike_fund_id 
    AND DATE_TRUNC('week', pa.attendance_date) = DATE_TRUNC('week', sd.week_start_date)
WHERE sf.strike_status = 'active'
GROUP BY sf.id, sf.tenant_id, DATE_TRUNC('week', pa.attendance_date), sf.current_balance, sf.estimated_burn_rate;

-- Create indexes on materialized view
CREATE INDEX idx_mv_strike_summary_fund ON mv_weekly_strike_summary(strike_fund_id, week_start DESC);
CREATE INDEX idx_mv_strike_summary_tenant ON mv_weekly_strike_summary(tenant_id, week_start DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.strike_funds IS 'Master strike fund management with balance tracking and AI burn-rate predictions';
COMMENT ON TABLE public.fund_eligibility IS 'Member eligibility tracking for strike fund benefits based on dues status and participation';
COMMENT ON TABLE public.picket_attendance IS 'GPS-verified picket line attendance tracking with NFC/QR check-in support';
COMMENT ON TABLE public.stipend_disbursements IS 'Weekly stipend payments to striking members based on verified attendance';
COMMENT ON TABLE public.public_donations IS 'Public fundraising donations from supporters and partner organizations';
COMMENT ON TABLE public.hardship_applications IS 'Emergency financial assistance applications for members facing hardships during strikes';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To refresh the materialized view, run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_strike_summary;
--
-- PostGIS functions available:
-- - ST_Distance(geography, geography) -> distance in meters
-- - ST_DWithin(geography, geography, distance) -> boolean within radius
-- - ST_SetSRID(geometry, srid) -> set coordinate system (4326 = WGS84)
-- - ST_MakePoint(longitude, latitude) -> create point geometry
