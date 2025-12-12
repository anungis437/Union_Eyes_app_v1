-- =====================================================================================
-- PHASE 7: ORGANIZING TOOLS - COMPREHENSIVE CAMPAIGN MANAGEMENT SYSTEM
-- =====================================================================================
-- Version: 1.0
-- Created: December 6, 2025
-- Purpose: Complete organizing campaign management with card signing, NLRB/CLRB filings,
--          certification workflow, vote management, field organizer tools, employer tracking
-- =====================================================================================

-- =====================================================================================
-- TABLE: organizing_campaigns
-- Purpose: Manage organizing campaigns with workplace demographics and progress tracking
-- =====================================================================================
CREATE TABLE IF NOT EXISTS organizing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Campaign identification
    campaign_name VARCHAR(255) NOT NULL,
    campaign_code VARCHAR(50) UNIQUE NOT NULL, -- Short code for field use
    target_employer VARCHAR(255) NOT NULL,
    workplace_location TEXT NOT NULL,
    
    -- Campaign details
    industry VARCHAR(100),
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'voluntary_recognition', -- voluntary_recognition, nlrb_election, clrb_election
    status VARCHAR(50) NOT NULL DEFAULT 'planning', -- planning, active, card_signing, filing_pending, election_scheduled, won, lost, withdrawn
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Workplace demographics
    estimated_unit_size INTEGER NOT NULL,
    target_card_count INTEGER, -- Calculated as 50-70% of unit size
    cards_signed INTEGER DEFAULT 0,
    card_signing_progress DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_card_count > 0 THEN (cards_signed::DECIMAL / target_card_count * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Key personnel
    lead_organizer_id UUID REFERENCES profiles(id),
    organizing_team UUID[], -- Array of organizer profile IDs
    
    -- Campaign timeline
    campaign_start_date DATE,
    target_card_deadline DATE,
    filing_date DATE,
    election_date DATE,
    certification_date DATE,
    campaign_end_date DATE,
    
    -- Campaign strategy
    organizing_strategy TEXT,
    key_issues TEXT[], -- Array of key workplace issues
    employer_vulnerabilities TEXT[],
    union_advantages TEXT[],
    
    -- Progress metrics
    contacts_identified INTEGER DEFAULT 0,
    contacts_committed INTEGER DEFAULT 0,
    house_visits_completed INTEGER DEFAULT 0,
    workplace_meetings_held INTEGER DEFAULT 0,
    
    -- Campaign outcomes
    election_eligible_voters INTEGER,
    votes_for_union INTEGER,
    votes_against_union INTEGER,
    challenged_ballots INTEGER,
    election_result VARCHAR(50), -- union_won, union_lost, pending, challenged
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for organizing_campaigns
CREATE INDEX idx_organizing_campaigns_tenant ON organizing_campaigns(tenant_id);
CREATE INDEX idx_organizing_campaigns_status ON organizing_campaigns(status);
CREATE INDEX idx_organizing_campaigns_lead ON organizing_campaigns(lead_organizer_id);
CREATE INDEX idx_organizing_campaigns_employer ON organizing_campaigns(target_employer);
CREATE INDEX idx_organizing_campaigns_progress ON organizing_campaigns(card_signing_progress);
CREATE INDEX idx_organizing_campaigns_active ON organizing_campaigns(tenant_id, status) WHERE status IN ('active', 'card_signing', 'filing_pending');

-- =====================================================================================
-- TABLE: organizing_contacts
-- Purpose: Track potential union members with workplace mapping and commitment levels
-- =====================================================================================
CREATE TABLE IF NOT EXISTS organizing_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    
    -- Contact information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    preferred_contact_method VARCHAR(20) DEFAULT 'phone', -- phone, email, text, in_person
    
    -- Workplace details
    job_title VARCHAR(100),
    department VARCHAR(100),
    shift VARCHAR(50), -- day, evening, night, rotating
    hire_date DATE,
    seniority_years DECIMAL(4,1),
    
    -- Workplace mapping
    work_location VARCHAR(255), -- Building, floor, area
    supervisor VARCHAR(100),
    immediate_coworkers TEXT[], -- Names of close coworkers
    influence_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, leader
    
    -- Organizing assessment
    commitment_level VARCHAR(50) NOT NULL DEFAULT 'unknown', -- unknown, hostile, neutral, interested, committed, activist
    union_sentiment VARCHAR(20), -- strongly_against, against, neutral, supportive, strongly_supportive
    card_signed BOOLEAN DEFAULT FALSE,
    card_signed_date DATE,
    willing_to_organize BOOLEAN DEFAULT FALSE,
    issues_concerned_about TEXT[],
    
    -- Contact history
    first_contact_date DATE,
    last_contact_date DATE,
    total_contacts INTEGER DEFAULT 0,
    house_visit_completed BOOLEAN DEFAULT FALSE,
    house_visit_date DATE,
    
    -- Risk assessment
    likely_to_vote_yes BOOLEAN,
    employer_loyalist BOOLEAN DEFAULT FALSE,
    potential_risks TEXT, -- Notes on potential risks (management family, anti-union history, etc.)
    
    -- Notes and tags
    notes TEXT,
    tags TEXT[], -- Array of tags (leader, swing_vote, needs_follow_up, etc.)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Indexes for organizing_contacts
CREATE INDEX idx_organizing_contacts_tenant ON organizing_contacts(tenant_id);
CREATE INDEX idx_organizing_contacts_campaign ON organizing_contacts(campaign_id);
CREATE INDEX idx_organizing_contacts_commitment ON organizing_contacts(commitment_level);
CREATE INDEX idx_organizing_contacts_card_signed ON organizing_contacts(card_signed);
CREATE INDEX idx_organizing_contacts_name ON organizing_contacts(last_name, first_name);
CREATE INDEX idx_organizing_contacts_department ON organizing_contacts(campaign_id, department);
CREATE INDEX idx_organizing_contacts_influence ON organizing_contacts(campaign_id, influence_level);

-- =====================================================================================
-- TABLE: card_signing_events
-- Purpose: Track individual card signing events with signature validation
-- =====================================================================================
CREATE TABLE IF NOT EXISTS card_signing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES organizing_contacts(id) ON DELETE CASCADE,
    
    -- Signing details
    signed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    signed_time TIME,
    signing_location VARCHAR(255), -- Where card was signed (home, workplace, union hall, etc.)
    
    -- Witness and validation
    witnessed_by UUID REFERENCES profiles(id), -- Organizer who witnessed
    witness_signature_data JSONB, -- Digital signature data
    card_photo_url TEXT, -- Photo of signed card for records
    
    -- Card details
    card_type VARCHAR(50) DEFAULT 'authorization', -- authorization, membership, interest
    card_status VARCHAR(50) NOT NULL DEFAULT 'valid', -- valid, invalid, challenged, withdrawn
    invalidation_reason TEXT,
    
    -- Legal compliance
    voluntary_signature BOOLEAN NOT NULL DEFAULT TRUE,
    signature_obtained_properly BOOLEAN NOT NULL DEFAULT TRUE,
    date_accurate BOOLEAN NOT NULL DEFAULT TRUE,
    meets_legal_requirements BOOLEAN GENERATED ALWAYS AS (
        voluntary_signature AND signature_obtained_properly AND date_accurate
    ) STORED,
    
    -- Submission tracking
    submitted_to_nlrb_clrb BOOLEAN DEFAULT FALSE,
    submission_date DATE,
    submission_batch_id UUID,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Indexes for card_signing_events
CREATE INDEX idx_card_signing_tenant ON card_signing_events(tenant_id);
CREATE INDEX idx_card_signing_campaign ON card_signing_events(campaign_id);
CREATE INDEX idx_card_signing_contact ON card_signing_events(contact_id);
CREATE INDEX idx_card_signing_date ON card_signing_events(signed_date);
CREATE INDEX idx_card_signing_status ON card_signing_events(card_status);
CREATE INDEX idx_card_signing_submitted ON card_signing_events(submitted_to_nlrb_clrb);

-- =====================================================================================
-- TABLE: nlrb_clrb_filings
-- Purpose: Manage NLRB (US) and CLRB (Canada) certification application filings
-- =====================================================================================
CREATE TABLE IF NOT EXISTS nlrb_clrb_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    
    -- Filing identification
    filing_type VARCHAR(50) NOT NULL, -- nlrb_rc, nlrb_rm, clrb_certification, clrb_revocation
    filing_number VARCHAR(100) UNIQUE, -- Official case number from NLRB/CLRB
    jurisdiction VARCHAR(50) NOT NULL, -- federal_us, federal_canada, provincial (BC, ON, QC, etc.)
    
    -- Filing details
    filed_date DATE NOT NULL,
    filed_by VARCHAR(255), -- Union representative name
    employer_notified_date DATE,
    
    -- Unit description
    bargaining_unit_description TEXT NOT NULL,
    unit_size_claimed INTEGER NOT NULL,
    unit_job_classifications TEXT[], -- Array of job titles included
    excluded_positions TEXT[], -- Management, confidential, etc.
    
    -- Supporting evidence
    showing_of_interest_percentage DECIMAL(5,2), -- Typically 30-50%
    cards_submitted_count INTEGER,
    card_submission_batch_ids UUID[], -- References to card_signing_events
    
    -- NLRB/CLRB process stages
    status VARCHAR(50) NOT NULL DEFAULT 'filed', -- filed, pending_review, hearing_scheduled, approved, denied, withdrawn
    hearing_date DATE,
    hearing_location TEXT,
    hearing_outcome VARCHAR(50), -- approved, denied, modified, pending_decision
    
    -- Election details (if approved)
    election_scheduled_date DATE,
    election_location TEXT,
    election_type VARCHAR(50), -- mail_ballot, manual, mixed
    election_conducted BOOLEAN DEFAULT FALSE,
    
    -- Documents
    petition_document_url TEXT,
    showing_of_interest_document_url TEXT,
    hearing_transcripts_url TEXT,
    decision_document_url TEXT,
    
    -- Employer response tracking
    employer_contested BOOLEAN DEFAULT FALSE,
    employer_objections TEXT[],
    employer_counter_arguments TEXT,
    employer_representation VARCHAR(255), -- Law firm or representative
    
    -- Decision and outcomes
    decision_date DATE,
    decision_summary TEXT,
    unit_approved BOOLEAN,
    approved_unit_size INTEGER,
    approved_job_classifications TEXT[],
    appeal_filed BOOLEAN DEFAULT FALSE,
    appeal_status VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Indexes for nlrb_clrb_filings
CREATE INDEX idx_nlrb_clrb_tenant ON nlrb_clrb_filings(tenant_id);
CREATE INDEX idx_nlrb_clrb_campaign ON nlrb_clrb_filings(campaign_id);
CREATE INDEX idx_nlrb_clrb_status ON nlrb_clrb_filings(status);
CREATE INDEX idx_nlrb_clrb_filing_number ON nlrb_clrb_filings(filing_number);
CREATE INDEX idx_nlrb_clrb_jurisdiction ON nlrb_clrb_filings(jurisdiction);
CREATE INDEX idx_nlrb_clrb_election_date ON nlrb_clrb_filings(election_scheduled_date);

-- =====================================================================================
-- TABLE: union_representation_votes
-- Purpose: Track union representation election/vote results with detailed breakdown
-- =====================================================================================
CREATE TABLE IF NOT EXISTS union_representation_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    filing_id UUID REFERENCES nlrb_clrb_filings(id),
    
    -- Vote/election details
    vote_date DATE NOT NULL,
    vote_type VARCHAR(50) NOT NULL, -- nlrb_election, clrb_vote, card_check, voluntary_recognition
    voting_method VARCHAR(50), -- in_person, mail_ballot, electronic, mixed
    
    -- Eligibility and participation
    eligible_voters INTEGER NOT NULL,
    ballots_cast INTEGER NOT NULL,
    voter_turnout_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN eligible_voters > 0 THEN (ballots_cast::DECIMAL / eligible_voters * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Vote results
    votes_for_union INTEGER NOT NULL DEFAULT 0,
    votes_against_union INTEGER NOT NULL DEFAULT 0,
    challenged_ballots INTEGER DEFAULT 0,
    void_ballots INTEGER DEFAULT 0,
    
    -- Vote outcome
    union_vote_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (votes_for_union + votes_against_union) > 0 
            THEN (votes_for_union::DECIMAL / (votes_for_union + votes_against_union) * 100)
            ELSE 0 
        END
    ) STORED,
    result VARCHAR(50) NOT NULL, -- union_certified, union_defeated, challenged, runoff_required
    certification_issued BOOLEAN DEFAULT FALSE,
    certification_date DATE,
    
    -- Vote breakdown by location/shift (optional)
    vote_breakdown_by_department JSONB, -- {"department_name": {"yes": 15, "no": 8}}
    vote_breakdown_by_shift JSONB, -- {"day": {"yes": 25, "no": 12}}
    
    -- Challenges and objections
    union_filed_objections BOOLEAN DEFAULT FALSE,
    employer_filed_objections BOOLEAN DEFAULT FALSE,
    objections_summary TEXT,
    objections_resolved BOOLEAN,
    objections_resolution TEXT,
    
    -- Post-vote actions
    recount_requested BOOLEAN DEFAULT FALSE,
    recount_date DATE,
    recount_result VARCHAR(50),
    
    -- Certification details (if union won)
    certification_number VARCHAR(100),
    bargaining_unit_certified TEXT,
    union_representative_name VARCHAR(255),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Indexes for union_representation_votes
CREATE INDEX idx_union_votes_tenant ON union_representation_votes(tenant_id);
CREATE INDEX idx_union_votes_campaign ON union_representation_votes(campaign_id);
CREATE INDEX idx_union_votes_filing ON union_representation_votes(filing_id);
CREATE INDEX idx_union_votes_date ON union_representation_votes(vote_date);
CREATE INDEX idx_union_votes_result ON union_representation_votes(result);

-- =====================================================================================
-- TABLE: field_organizer_activities
-- Purpose: Track daily field activities for organizers (house visits, meetings, calls)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS field_organizer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES profiles(id),
    contact_id UUID REFERENCES organizing_contacts(id),
    
    -- Activity details
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type VARCHAR(50) NOT NULL, -- house_visit, phone_call, workplace_visit, text_message, group_meeting, one_on_one
    activity_duration_minutes INTEGER,
    
    -- Location (for offline/GPS tracking)
    activity_location TEXT,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    offline_mode_used BOOLEAN DEFAULT FALSE, -- Synced later when online
    
    -- Activity outcomes
    contact_made BOOLEAN NOT NULL DEFAULT FALSE,
    commitment_level_before VARCHAR(50),
    commitment_level_after VARCHAR(50),
    card_signed BOOLEAN DEFAULT FALSE,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    -- Discussion topics
    issues_discussed TEXT[],
    concerns_raised TEXT[],
    questions_asked TEXT[],
    materials_distributed TEXT[], -- Flyers, fact sheets, etc.
    
    -- Activity assessment
    interaction_quality VARCHAR(20), -- poor, fair, good, excellent
    likely_to_vote_yes BOOLEAN,
    willing_to_help_organize BOOLEAN DEFAULT FALSE,
    potential_leader BOOLEAN DEFAULT FALSE,
    
    -- Notes
    detailed_notes TEXT,
    organizer_observations TEXT,
    next_steps TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE, -- When offline data was synced
    created_by UUID REFERENCES profiles(id)
);

-- Indexes for field_organizer_activities
CREATE INDEX idx_field_activities_tenant ON field_organizer_activities(tenant_id);
CREATE INDEX idx_field_activities_campaign ON field_organizer_activities(campaign_id);
CREATE INDEX idx_field_activities_organizer ON field_organizer_activities(organizer_id);
CREATE INDEX idx_field_activities_contact ON field_organizer_activities(contact_id);
CREATE INDEX idx_field_activities_date ON field_organizer_activities(activity_date);
CREATE INDEX idx_field_activities_type ON field_organizer_activities(activity_type);
CREATE INDEX idx_field_activities_follow_up ON field_organizer_activities(campaign_id, follow_up_needed, follow_up_date);

-- =====================================================================================
-- TABLE: employer_responses
-- Purpose: Track employer anti-union activities and responses to organizing campaign
-- =====================================================================================
CREATE TABLE IF NOT EXISTS employer_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    
    -- Response details
    response_date DATE NOT NULL DEFAULT CURRENT_DATE,
    response_type VARCHAR(50) NOT NULL, -- captive_audience_meeting, one_on_one_meetings, anti_union_materials, consultant_hired, discipline, termination, surveillance, other
    
    -- Response description
    response_summary TEXT NOT NULL,
    response_severity VARCHAR(20) DEFAULT 'moderate', -- minor, moderate, serious, severe
    
    -- Captive audience meetings
    meeting_attendance_mandatory BOOLEAN,
    meeting_location TEXT,
    meeting_date_time TIMESTAMP,
    speakers TEXT[], -- Names of management/consultants
    talking_points TEXT[], -- Key anti-union messages
    
    -- Anti-union materials
    materials_distributed TEXT[], -- Flyers, emails, posters, videos
    material_urls TEXT[], -- Links to photos/documents
    material_content_summary TEXT,
    
    -- External consultants
    anti_union_consultant_name VARCHAR(255),
    consultant_firm VARCHAR(255),
    consultant_tactics TEXT[],
    
    -- Disciplinary actions
    employee_disciplined BOOLEAN DEFAULT FALSE,
    employee_terminated BOOLEAN DEFAULT FALSE,
    affected_contact_id UUID REFERENCES organizing_contacts(id),
    alleged_reason TEXT,
    suspected_retaliation BOOLEAN DEFAULT FALSE,
    
    -- Surveillance and intimidation
    surveillance_reported BOOLEAN DEFAULT FALSE,
    surveillance_description TEXT,
    intimidation_tactics TEXT[],
    
    -- Legal implications
    potential_ulp BOOLEAN DEFAULT FALSE, -- Unfair Labor Practice
    ulp_filed BOOLEAN DEFAULT FALSE,
    ulp_case_number VARCHAR(100),
    nlrb_clrb_complaint_filed BOOLEAN DEFAULT FALSE,
    
    -- Union response
    union_counter_strategy TEXT,
    union_action_taken TEXT[],
    organizers_assigned_response UUID[], -- Organizer IDs handling response
    
    -- Impact assessment
    impact_on_campaign VARCHAR(20), -- minimal, moderate, significant, severe
    contacts_influenced INTEGER,
    estimated_support_lost DECIMAL(5,2), -- Percentage
    
    -- Evidence and documentation
    evidence_documents TEXT[], -- URLs to photos, videos, recordings, documents
    witness_statements TEXT[],
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- Indexes for employer_responses
CREATE INDEX idx_employer_responses_tenant ON employer_responses(tenant_id);
CREATE INDEX idx_employer_responses_campaign ON employer_responses(campaign_id);
CREATE INDEX idx_employer_responses_date ON employer_responses(response_date);
CREATE INDEX idx_employer_responses_type ON employer_responses(response_type);
CREATE INDEX idx_employer_responses_severity ON employer_responses(response_severity);
CREATE INDEX idx_employer_responses_ulp ON employer_responses(potential_ulp, ulp_filed);

-- =====================================================================================
-- TABLE: organizing_campaign_milestones
-- Purpose: Track key campaign milestones and deadlines
-- =====================================================================================
CREATE TABLE IF NOT EXISTS organizing_campaign_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id) ON DELETE CASCADE,
    
    -- Milestone details
    milestone_name VARCHAR(255) NOT NULL,
    milestone_type VARCHAR(50) NOT NULL, -- card_goal_25, card_goal_50, card_goal_70, filing_deadline, hearing_date, election_date, certification, custom
    target_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date DATE,
    
    -- Progress tracking
    target_metric VARCHAR(50), -- cards_signed, contacts_committed, house_visits, meetings_held
    target_value INTEGER,
    current_value INTEGER,
    progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_value > 0 THEN (current_value::DECIMAL / target_value * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- Milestone status
    status VARCHAR(50) DEFAULT 'pending', -- pending, on_track, at_risk, behind, completed, missed
    days_until_deadline INTEGER GENERATED ALWAYS AS (
        target_date - CURRENT_DATE
    ) STORED,
    
    -- Notifications
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_date DATE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Indexes for organizing_campaign_milestones
CREATE INDEX idx_campaign_milestones_tenant ON organizing_campaign_milestones(tenant_id);
CREATE INDEX idx_campaign_milestones_campaign ON organizing_campaign_milestones(campaign_id);
CREATE INDEX idx_campaign_milestones_target_date ON organizing_campaign_milestones(target_date);
CREATE INDEX idx_campaign_milestones_status ON organizing_campaign_milestones(status);
CREATE INDEX idx_campaign_milestones_pending ON organizing_campaign_milestones(campaign_id, status) WHERE status IN ('pending', 'on_track', 'at_risk', 'behind');

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all organizing tables
ALTER TABLE organizing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_signing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlrb_clrb_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE union_representation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_organizer_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizing_campaign_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizing_campaigns
CREATE POLICY organizing_campaigns_tenant_isolation ON organizing_campaigns
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY organizing_campaigns_select ON organizing_campaigns
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
            OR lead_organizer_id = current_setting('app.current_user_id')::UUID
            OR current_setting('app.current_user_id')::UUID = ANY(organizing_team)
        )
    );

CREATE POLICY organizing_campaigns_insert ON organizing_campaigns
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer')
    );

CREATE POLICY organizing_campaigns_update ON organizing_campaigns
    FOR UPDATE USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            current_setting('app.current_user_role') IN ('admin', 'organizer')
            OR lead_organizer_id = current_setting('app.current_user_id')::UUID
        )
    );

-- RLS Policies for organizing_contacts
CREATE POLICY organizing_contacts_tenant_isolation ON organizing_contacts
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY organizing_contacts_select ON organizing_contacts
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
            OR EXISTS (
                SELECT 1 FROM organizing_campaigns 
                WHERE organizing_campaigns.id = organizing_contacts.campaign_id
                AND (
                    organizing_campaigns.lead_organizer_id = current_setting('app.current_user_id')::UUID
                    OR current_setting('app.current_user_id')::UUID = ANY(organizing_campaigns.organizing_team)
                )
            )
        )
    );

CREATE POLICY organizing_contacts_insert ON organizing_contacts
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY organizing_contacts_update ON organizing_contacts
    FOR UPDATE USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

-- RLS Policies for card_signing_events
CREATE POLICY card_signing_tenant_isolation ON card_signing_events
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY card_signing_select ON card_signing_events
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY card_signing_insert ON card_signing_events
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

-- RLS Policies for nlrb_clrb_filings
CREATE POLICY nlrb_clrb_tenant_isolation ON nlrb_clrb_filings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY nlrb_clrb_select ON nlrb_clrb_filings
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY nlrb_clrb_insert ON nlrb_clrb_filings
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer')
    );

CREATE POLICY nlrb_clrb_update ON nlrb_clrb_filings
    FOR UPDATE USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer')
    );

-- RLS Policies for union_representation_votes
CREATE POLICY union_votes_tenant_isolation ON union_representation_votes
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY union_votes_select ON union_representation_votes
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY union_votes_insert ON union_representation_votes
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer')
    );

-- RLS Policies for field_organizer_activities
CREATE POLICY field_activities_tenant_isolation ON field_organizer_activities
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY field_activities_select ON field_organizer_activities
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
            OR organizer_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY field_activities_insert ON field_organizer_activities
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND (
            current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
            OR organizer_id = current_setting('app.current_user_id')::UUID
        )
    );

-- RLS Policies for employer_responses
CREATE POLICY employer_responses_tenant_isolation ON employer_responses
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY employer_responses_select ON employer_responses
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY employer_responses_insert ON employer_responses
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY employer_responses_update ON employer_responses
    FOR UPDATE USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

-- RLS Policies for organizing_campaign_milestones
CREATE POLICY campaign_milestones_tenant_isolation ON organizing_campaign_milestones
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY campaign_milestones_select ON organizing_campaign_milestones
    FOR SELECT USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY campaign_milestones_insert ON organizing_campaign_milestones
    FOR INSERT WITH CHECK (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

CREATE POLICY campaign_milestones_update ON organizing_campaign_milestones
    FOR UPDATE USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID
        AND current_setting('app.current_user_role') IN ('admin', 'organizer', 'staff')
    );

-- =====================================================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Function: Update campaign card count when cards are signed
CREATE OR REPLACE FUNCTION update_campaign_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.card_status = 'valid') OR 
       (TG_OP = 'UPDATE' AND NEW.card_status = 'valid' AND OLD.card_status != 'valid') THEN
        UPDATE organizing_campaigns
        SET cards_signed = cards_signed + 1
        WHERE id = NEW.campaign_id;
    ELSIF (TG_OP = 'UPDATE' AND NEW.card_status != 'valid' AND OLD.card_status = 'valid') OR
          (TG_OP = 'DELETE' AND OLD.card_status = 'valid') THEN
        UPDATE organizing_campaigns
        SET cards_signed = GREATEST(cards_signed - 1, 0)
        WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_card_count
AFTER INSERT OR UPDATE OR DELETE ON card_signing_events
FOR EACH ROW
EXECUTE FUNCTION update_campaign_card_count();

-- Function: Update contact when card is signed
CREATE OR REPLACE FUNCTION update_contact_card_signed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.card_status = 'valid' THEN
        UPDATE organizing_contacts
        SET card_signed = TRUE,
            card_signed_date = NEW.signed_date,
            commitment_level = 'committed'
        WHERE id = NEW.contact_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_card_signed
AFTER INSERT OR UPDATE ON card_signing_events
FOR EACH ROW
EXECUTE FUNCTION update_contact_card_signed();

-- Function: Update contact last_contact_date and total_contacts
CREATE OR REPLACE FUNCTION update_contact_activity_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE organizing_contacts
    SET last_contact_date = NEW.activity_date,
        total_contacts = total_contacts + 1,
        first_contact_date = COALESCE(first_contact_date, NEW.activity_date),
        house_visit_completed = CASE 
            WHEN NEW.activity_type = 'house_visit' THEN TRUE 
            ELSE house_visit_completed 
        END,
        house_visit_date = CASE 
            WHEN NEW.activity_type = 'house_visit' THEN NEW.activity_date 
            ELSE house_visit_date 
        END,
        commitment_level = COALESCE(NEW.commitment_level_after, commitment_level)
    WHERE id = NEW.contact_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_activity_stats
AFTER INSERT ON field_organizer_activities
FOR EACH ROW
WHEN (NEW.contact_id IS NOT NULL)
EXECUTE FUNCTION update_contact_activity_stats();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organizing_campaigns_updated_at
BEFORE UPDATE ON organizing_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_organizing_updated_at();

CREATE TRIGGER trigger_organizing_contacts_updated_at
BEFORE UPDATE ON organizing_contacts
FOR EACH ROW
EXECUTE FUNCTION update_organizing_updated_at();

CREATE TRIGGER trigger_nlrb_clrb_updated_at
BEFORE UPDATE ON nlrb_clrb_filings
FOR EACH ROW
EXECUTE FUNCTION update_organizing_updated_at();

CREATE TRIGGER trigger_union_votes_updated_at
BEFORE UPDATE ON union_representation_votes
FOR EACH ROW
EXECUTE FUNCTION update_organizing_updated_at();

CREATE TRIGGER trigger_employer_responses_updated_at
BEFORE UPDATE ON employer_responses
FOR EACH ROW
EXECUTE FUNCTION update_organizing_updated_at();

CREATE TRIGGER trigger_campaign_milestones_updated_at
BEFORE UPDATE ON organizing_campaign_milestones
FOR EACH ROW
EXECUTE FUNCTION update_organizing_updated_at();

-- =====================================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE organizing_campaigns IS 'Manages organizing campaigns with comprehensive tracking of card signing progress, workplace demographics, and campaign outcomes. Supports voluntary recognition, NLRB, and CLRB election campaigns.';
COMMENT ON TABLE organizing_contacts IS 'Tracks potential union members with detailed workplace mapping, commitment levels, and influence assessment. Core to organizing strategy and vote prediction.';
COMMENT ON TABLE card_signing_events IS 'Records individual authorization card signings with legal validation, witness information, and submission tracking for NLRB/CLRB filings.';
COMMENT ON TABLE nlrb_clrb_filings IS 'Manages certification applications to NLRB (US) or CLRB (Canada) including petition documents, hearing tracking, and employer response monitoring.';
COMMENT ON TABLE union_representation_votes IS 'Comprehensive election/vote result tracking with detailed breakdowns, challenge management, and certification issuance.';
COMMENT ON TABLE field_organizer_activities IS 'Daily activity log for field organizers with offline mode support, GPS tracking, and follow-up management for house visits and contacts.';
COMMENT ON TABLE employer_responses IS 'Tracks employer anti-union activities, captive audience meetings, consultant hiring, and potential unfair labor practices (ULPs).';
COMMENT ON TABLE organizing_campaign_milestones IS 'Manages campaign deadlines and milestones with automatic progress calculation and reminder system.';
