-- Migration: Organizing Module
-- Description: Comprehensive organizing campaigns, workplace mapping, card-check tracking, NLRB/CIRB certification
-- Phase: 3 - Strategic CLC Features
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: ORGANIZING CAMPAIGNS
-- =====================================================================================

-- Campaign status lifecycle
DROP TYPE IF EXISTS organizing_campaign_status CASCADE;
CREATE TYPE organizing_campaign_status AS ENUM (
  'research',
  'pre_campaign',
  'active',
  'card_check',
  'certification_pending',
  'certification_vote',
  'won',
  'lost',
  'suspended',
  'abandoned'
);

-- Campaign types
DROP TYPE IF EXISTS organizing_campaign_type CASCADE;
CREATE TYPE organizing_campaign_type AS ENUM (
  'new_workplace',
  'raid', -- Taking members from another union
  'expansion', -- Expanding within existing employer
  'decertification_defense',
  'voluntary_recognition',
  'card_check_majority'
);

-- Organizing campaigns
CREATE TABLE IF NOT EXISTS organizing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Campaign basics
  campaign_name VARCHAR(200) NOT NULL,
  campaign_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "ORG-2024-ACME-001"
  campaign_type organizing_campaign_type NOT NULL,
  campaign_status organizing_campaign_status DEFAULT 'research',
  
  -- Target workplace
  target_employer_name VARCHAR(300) NOT NULL,
  target_employer_address TEXT,
  target_industry VARCHAR(200),
  target_naics_code VARCHAR(10), -- 6-digit NAICS
  
  -- Bargaining unit definition
  proposed_bargaining_unit_name VARCHAR(300),
  proposed_bargaining_unit_description TEXT,
  excluded_positions TEXT, -- Managers, confidential employees
  
  -- Workforce size
  estimated_eligible_workers INTEGER,
  estimated_total_workforce INTEGER,
  
  -- Geography
  workplace_city VARCHAR(100),
  workplace_province VARCHAR(2),
  workplace_postal_code VARCHAR(7),
  workplace_coordinates POINT, -- PostGIS point for mapping
  is_multi_location BOOLEAN DEFAULT false,
  
  -- Jurisdiction
  labor_board_jurisdiction VARCHAR(50), -- federal, ON, QC, BC, AB, etc.
  labor_board_name VARCHAR(200), -- "Canada Industrial Relations Board", "Ontario Labour Relations Board"
  labor_relations_act VARCHAR(200), -- "Canada Labour Code", "Ontario Labour Relations Act"
  
  -- Timeline
  research_start_date DATE,
  campaign_launch_date DATE,
  card_check_start_date DATE,
  card_check_deadline DATE,
  certification_application_date DATE,
  certification_vote_date DATE,
  certification_decision_date DATE,
  first_contract_deadline DATE,
  
  -- Target metrics
  card_signing_goal INTEGER, -- Number of cards needed (usually 40-55%)
  card_signing_threshold_percentage DECIMAL(5,2) DEFAULT 40.00,
  super_majority_goal INTEGER, -- Ideal goal (usually 65-75%)
  super_majority_threshold_percentage DECIMAL(5,2) DEFAULT 65.00,
  
  -- Current progress
  cards_signed_count INTEGER DEFAULT 0,
  cards_signed_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_card_signed_date DATE,
  
  -- Lead organizer
  lead_organizer_id UUID,
  lead_organizer_name VARCHAR(200),
  organizing_committee_size INTEGER DEFAULT 0,
  
  -- Opposition
  employer_resistance_level VARCHAR(50), -- low, moderate, high, extreme
  anti_union_consultant_involved BOOLEAN DEFAULT false,
  anti_union_consultant_name VARCHAR(200),
  captive_audience_meetings_count INTEGER DEFAULT 0,
  
  -- Incumbent union (for raids)
  incumbent_union_name VARCHAR(200),
  incumbent_contract_expiry_date DATE,
  
  -- Outcome
  outcome_type VARCHAR(50), -- voluntary_recognition, certification_vote_won, certification_vote_lost, card_check_certified
  certification_vote_yes_count INTEGER,
  certification_vote_no_count INTEGER,
  certification_vote_eligible_voters INTEGER,
  certification_vote_turnout_percentage DECIMAL(5,2),
  
  certification_number VARCHAR(100), -- From labor board
  certification_date DATE,
  
  -- First contract
  first_contract_ratified_date DATE,
  first_contract_campaign_required BOOLEAN DEFAULT false, -- Section 87/Bill 30 campaign
  
  -- Cost tracking
  campaign_budget DECIMAL(12,2),
  campaign_expenses_to_date DECIMAL(12,2) DEFAULT 0.00,
  
  -- Resources
  full_time_organizers_assigned INTEGER DEFAULT 0,
  volunteer_organizers_count INTEGER DEFAULT 0,
  
  -- Documents
  campaign_plan_url TEXT,
  workplace_map_url TEXT,
  authorization_cards_template_url TEXT,
  certification_application_url TEXT,
  labor_board_decision_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_organizing_campaigns_org ON organizing_campaigns(organization_id);
CREATE INDEX idx_organizing_campaigns_status ON organizing_campaigns(campaign_status);
CREATE INDEX idx_organizing_campaigns_jurisdiction ON organizing_campaigns(labor_board_jurisdiction);
CREATE INDEX idx_organizing_campaigns_employer ON organizing_campaigns(target_employer_name);
CREATE INDEX idx_organizing_campaigns_lead_organizer ON organizing_campaigns(lead_organizer_id);
CREATE INDEX idx_organizing_campaigns_dates ON organizing_campaigns(campaign_launch_date, card_check_deadline);

-- RLS policies
ALTER TABLE organizing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_organizing_campaigns ON organizing_campaigns;
CREATE POLICY select_organizing_campaigns ON organizing_campaigns
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_organizing_campaigns ON organizing_campaigns;
CREATE POLICY manage_organizing_campaigns ON organizing_campaigns
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'organizer', 'organizing_director')
  );

-- =====================================================================================
-- PART 2: WORKPLACE CONTACTS & MAPPING
-- =====================================================================================

-- Contact support level
DROP TYPE IF EXISTS contact_support_level CASCADE;
CREATE TYPE contact_support_level AS ENUM (
  'strong_supporter', -- Will openly advocate
  'supporter', -- Supportive but cautious
  'undecided', -- On the fence
  'soft_opposition', -- Leans against
  'strong_opposition', -- Openly anti-union
  'unknown' -- Not yet assessed
);

-- Workplace contacts (potential members)
CREATE TABLE IF NOT EXISTS organizing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Contact identification
  contact_number VARCHAR(50) UNIQUE NOT NULL, -- Anonymous ID (e.g., "ACME-2024-001")
  
  -- Basic info (encrypted for security)
  first_name_encrypted TEXT,
  last_name_encrypted TEXT,
  personal_email_encrypted TEXT,
  personal_phone_encrypted TEXT,
  work_email_encrypted TEXT,
  work_phone_encrypted TEXT,
  
  -- Employment details
  job_title VARCHAR(200),
  department VARCHAR(200),
  shift VARCHAR(50), -- day, evening, night, rotating
  hire_date DATE,
  seniority_years DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  
  -- Demographics (for targeting)
  age_range VARCHAR(20), -- "18-24", "25-34", etc.
  primary_language VARCHAR(50),
  requires_interpretation BOOLEAN DEFAULT false,
  
  -- Location within workplace
  building_location VARCHAR(100),
  floor_number INTEGER,
  workstation_area VARCHAR(100),
  
  -- Contact assessment
  support_level contact_support_level DEFAULT 'unknown',
  organizing_committee_member BOOLEAN DEFAULT false,
  organizing_committee_role VARCHAR(100), -- "workplace lead", "shift captain", "department rep"
  natural_leader BOOLEAN DEFAULT false,
  
  -- Authorization card
  card_signed BOOLEAN DEFAULT false,
  card_signed_date DATE,
  card_witnessed_by VARCHAR(200),
  card_revoked BOOLEAN DEFAULT false,
  card_revoked_date DATE,
  
  -- House visit
  house_visit_attempted BOOLEAN DEFAULT false,
  house_visit_completed BOOLEAN DEFAULT false,
  house_visit_date DATE,
  house_visit_notes TEXT,
  
  -- Contact attempts
  last_contact_date DATE,
  last_contact_method VARCHAR(50), -- phone, text, email, in_person, house_visit
  contact_attempts_count INTEGER DEFAULT 0,
  
  -- Issues/concerns
  primary_issues JSONB, -- Array of issues: ["wages", "benefits", "safety", "respect"]
  workplace_concerns TEXT,
  personal_story TEXT, -- Why they support organizing
  
  -- Relationship mapping
  close_coworkers JSONB, -- Array of contact_ids they influence
  influenced_by JSONB, -- Array of contact_ids who influence them
  
  -- Barriers to support
  fear_level VARCHAR(50), -- low, moderate, high
  barriers_to_support TEXT, -- "fear of retaliation", "previous bad union experience"
  
  -- Employer targeting (for captive audience meetings)
  targeted_by_employer BOOLEAN DEFAULT false,
  targeted_date DATE,
  targeted_method TEXT, -- "one-on-one", "captive audience meeting", "anti-union video"
  
  -- Outcome
  voted_in_certification BOOLEAN,
  became_member BOOLEAN DEFAULT false,
  member_id UUID REFERENCES members(id),
  
  -- Data retention
  data_retention_deadline DATE, -- Must delete if campaign fails (privacy)
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_organizing_contacts_campaign ON organizing_contacts(campaign_id);
CREATE INDEX idx_organizing_contacts_support_level ON organizing_contacts(support_level);
CREATE INDEX idx_organizing_contacts_card_signed ON organizing_contacts(card_signed);
CREATE INDEX idx_organizing_contacts_committee ON organizing_contacts(organizing_committee_member);
CREATE INDEX idx_organizing_contacts_department ON organizing_contacts(department);
CREATE INDEX idx_organizing_contacts_shift ON organizing_contacts(shift);

-- RLS policies (HIGHLY RESTRICTIVE - organizing data is sensitive)
ALTER TABLE organizing_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_organizing_contacts ON organizing_contacts;
CREATE POLICY select_organizing_contacts ON organizing_contacts
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'organizer', 'organizing_director')
  );

DROP POLICY IF EXISTS manage_organizing_contacts ON organizing_contacts;
CREATE POLICY manage_organizing_contacts ON organizing_contacts
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'organizer', 'organizing_director')
  );

-- =====================================================================================
-- PART 3: ORGANIZING ACTIVITIES & EVENTS
-- =====================================================================================

-- Activity types
DROP TYPE IF EXISTS organizing_activity_type CASCADE;
CREATE TYPE organizing_activity_type AS ENUM (
  'house_visit',
  'phone_call',
  'text_message',
  'workplace_conversation',
  'organizing_meeting',
  'blitz', -- Coordinated day of action
  'workplace_action', -- Sticker day, wear red day, etc.
  'card_signing_session',
  'community_event',
  'rally',
  'picket',
  'press_conference',
  'social_media_campaign'
);

-- Organizing activities
CREATE TABLE IF NOT EXISTS organizing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Activity details
  activity_type organizing_activity_type NOT NULL,
  activity_name VARCHAR(200),
  activity_date DATE NOT NULL,
  activity_start_time TIME,
  activity_end_time TIME,
  
  -- Location
  activity_location VARCHAR(300),
  location_address TEXT,
  is_virtual BOOLEAN DEFAULT false,
  meeting_link TEXT,
  
  -- Participation
  contacts_targeted JSONB, -- Array of contact_ids
  contacts_attended JSONB, -- Array of contact_ids who showed up
  contacts_attended_count INTEGER DEFAULT 0,
  
  organizers_assigned JSONB, -- Array of organizer user_ids
  volunteers_attended INTEGER DEFAULT 0,
  
  -- Cards signed
  cards_signed_at_event INTEGER DEFAULT 0,
  
  -- Outcomes
  outcome_summary TEXT,
  contacts_moved_to_supporter INTEGER DEFAULT 0,
  new_organizing_committee_recruits INTEGER DEFAULT 0,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  -- Cost
  activity_cost DECIMAL(10,2) DEFAULT 0.00,
  
  -- Media
  photos_urls JSONB,
  videos_urls JSONB,
  social_media_posts JSONB,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_organizing_activities_campaign ON organizing_activities(campaign_id);
CREATE INDEX idx_organizing_activities_type ON organizing_activities(activity_type);
CREATE INDEX idx_organizing_activities_date ON organizing_activities(activity_date);

-- RLS policies
ALTER TABLE organizing_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_organizing_activities ON organizing_activities;
CREATE POLICY select_organizing_activities ON organizing_activities
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_organizing_activities ON organizing_activities;
CREATE POLICY manage_organizing_activities ON organizing_activities
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'organizer', 'organizing_director')
  );

-- =====================================================================================
-- PART 4: LABOR BOARD CERTIFICATION TRACKING
-- =====================================================================================

-- Certification application status
DROP TYPE IF EXISTS certification_application_status CASCADE;
CREATE TYPE certification_application_status AS ENUM (
  'draft',
  'filed',
  'under_review',
  'hearing_scheduled',
  'vote_ordered',
  'vote_completed',
  'decision_pending',
  'certified',
  'dismissed',
  'withdrawn'
);

-- Labor board certification applications
CREATE TABLE IF NOT EXISTS certification_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  campaign_id UUID NOT NULL REFERENCES organizing_campaigns(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Application details
  application_number VARCHAR(100) UNIQUE NOT NULL, -- Labor board file number
  application_status certification_application_status DEFAULT 'draft',
  
  -- Labor board
  labor_board_jurisdiction VARCHAR(50) NOT NULL,
  labor_board_name VARCHAR(200),
  
  -- Filing
  filed_date DATE,
  filed_by_name VARCHAR(200),
  
  -- Bargaining unit
  proposed_bargaining_unit_description TEXT,
  number_of_employees_claimed INTEGER,
  
  -- Card check evidence
  authorization_cards_submitted INTEGER,
  authorization_cards_percentage DECIMAL(5,2),
  
  -- Employer response
  employer_response_filed BOOLEAN DEFAULT false,
  employer_response_date DATE,
  employer_contested BOOLEAN DEFAULT false,
  employer_objections TEXT,
  employer_proposed_unit_changes TEXT,
  
  -- Incumbent union response (for raids)
  incumbent_union_response_filed BOOLEAN DEFAULT false,
  incumbent_union_response_date DATE,
  incumbent_union_objections TEXT,
  
  -- Hearings
  pre_hearing_scheduled BOOLEAN DEFAULT false,
  pre_hearing_date DATE,
  hearing_scheduled BOOLEAN DEFAULT false,
  hearing_date DATE,
  hearing_location VARCHAR(300),
  hearing_outcome TEXT,
  
  -- Voter list
  voter_list_received BOOLEAN DEFAULT false,
  voter_list_received_date DATE,
  voter_list_dispute_filed BOOLEAN DEFAULT false,
  voter_list_dispute_outcome TEXT,
  
  -- Vote
  vote_ordered BOOLEAN DEFAULT false,
  vote_ordered_date DATE,
  vote_method VARCHAR(50), -- in_person, mail_ballot, electronic, mixed
  vote_date DATE,
  vote_location VARCHAR(300),
  
  -- Vote results
  votes_yes INTEGER,
  votes_no INTEGER,
  votes_spoiled INTEGER,
  votes_challenged INTEGER,
  eligible_voters INTEGER,
  voter_turnout_percentage DECIMAL(5,2),
  
  -- Decision
  decision_date DATE,
  decision_outcome VARCHAR(50), -- certified, dismissed, vote_ordered, hearing_required
  decision_summary TEXT,
  decision_document_url TEXT,
  
  -- Certification
  certification_order_number VARCHAR(100),
  certification_date DATE,
  certification_document_url TEXT,
  
  bargaining_unit_certified_description TEXT,
  number_of_employees_certified INTEGER,
  
  -- Appeals
  appeal_filed BOOLEAN DEFAULT false,
  appeal_filed_by VARCHAR(100), -- employer, union, incumbent_union
  appeal_filed_date DATE,
  appeal_outcome TEXT,
  
  -- First contract arbitration (Bill 30 / Section 87)
  first_contract_arbitration_eligible BOOLEAN DEFAULT false,
  first_contract_arbitration_applied BOOLEAN DEFAULT false,
  first_contract_arbitration_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_certification_applications_campaign ON certification_applications(campaign_id);
CREATE INDEX idx_certification_applications_status ON certification_applications(application_status);
CREATE INDEX idx_certification_applications_jurisdiction ON certification_applications(labor_board_jurisdiction);
CREATE INDEX idx_certification_applications_filed_date ON certification_applications(filed_date);

-- RLS policies
ALTER TABLE certification_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_certification_applications ON certification_applications;
CREATE POLICY select_certification_applications ON certification_applications
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_certification_applications ON certification_applications;
CREATE POLICY manage_certification_applications ON certification_applications
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'organizer', 'organizing_director')
  );

-- =====================================================================================
-- PART 5: ORGANIZING VOLUNTEERS & ASSIGNMENTS
-- =====================================================================================

-- Volunteer availability
CREATE TABLE IF NOT EXISTS organizing_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID REFERENCES members(id),
  
  -- Volunteer info
  volunteer_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Experience
  organizing_experience_level VARCHAR(50), -- novice, intermediate, experienced, veteran
  previous_campaigns_count INTEGER DEFAULT 0,
  special_skills JSONB, -- ["bilingual_spanish", "graphic_design", "social_media", "public_speaking"]
  
  -- Availability
  available_weekdays BOOLEAN DEFAULT true,
  available_evenings BOOLEAN DEFAULT true,
  available_weekends BOOLEAN DEFAULT true,
  hours_per_week_available INTEGER,
  
  -- Training
  organizing_training_completed BOOLEAN DEFAULT false,
  training_completion_date DATE,
  
  -- Assignments
  current_campaigns JSONB, -- Array of campaign_ids
  total_house_visits_completed INTEGER DEFAULT 0,
  total_cards_signed_witnessed INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizing_volunteers_org ON organizing_volunteers(organization_id);
CREATE INDEX idx_organizing_volunteers_member ON organizing_volunteers(member_id);
CREATE INDEX idx_organizing_volunteers_active ON organizing_volunteers(is_active);

-- RLS policies
ALTER TABLE organizing_volunteers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_organizing_volunteers ON organizing_volunteers;
CREATE POLICY select_organizing_volunteers ON organizing_volunteers
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_organizing_volunteers ON organizing_volunteers;
CREATE POLICY manage_organizing_volunteers ON organizing_volunteers
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'organizer', 'organizing_director')
  );

-- =====================================================================================
-- PART 6: FUNCTIONS - CAMPAIGN METRICS
-- =====================================================================================

-- Function: Update campaign card count
CREATE OR REPLACE FUNCTION update_campaign_card_count(
  p_campaign_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_cards_signed INTEGER;
  v_eligible_workers INTEGER;
  v_percentage DECIMAL(5,2);
  v_last_card_date DATE;
BEGIN
  -- Count signed cards
  SELECT COUNT(*), MAX(card_signed_date)
  INTO v_cards_signed, v_last_card_date
  FROM organizing_contacts
  WHERE campaign_id = p_campaign_id
  AND card_signed = true
  AND card_revoked = false;
  
  -- Get eligible workers count
  SELECT estimated_eligible_workers INTO v_eligible_workers
  FROM organizing_campaigns
  WHERE id = p_campaign_id;
  
  -- Calculate percentage
  IF v_eligible_workers > 0 THEN
    v_percentage := ROUND((v_cards_signed::DECIMAL / v_eligible_workers) * 100, 2);
  ELSE
    v_percentage := 0.00;
  END IF;
  
  -- Update campaign
  UPDATE organizing_campaigns
  SET 
    cards_signed_count = v_cards_signed,
    cards_signed_percentage = v_percentage,
    last_card_signed_date = v_last_card_date,
    updated_at = NOW()
  WHERE id = p_campaign_id;
  
  RETURN jsonb_build_object(
    'campaign_id', p_campaign_id,
    'cards_signed', v_cards_signed,
    'eligible_workers', v_eligible_workers,
    'percentage', v_percentage,
    'last_card_date', v_last_card_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate campaign health score (0-100)
CREATE OR REPLACE FUNCTION calculate_campaign_health_score(
  p_campaign_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_campaign RECORD;
  v_organizing_committee_size INTEGER;
  v_supporter_percentage DECIMAL(5,2);
BEGIN
  SELECT * INTO v_campaign
  FROM organizing_campaigns
  WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Card signing progress (40 points max)
  IF v_campaign.cards_signed_percentage >= v_campaign.super_majority_threshold_percentage THEN
    v_score := v_score + 40;
  ELSIF v_campaign.cards_signed_percentage >= v_campaign.card_signing_threshold_percentage THEN
    v_score := v_score + 25;
  ELSIF v_campaign.cards_signed_percentage >= 20 THEN
    v_score := v_score + 10;
  END IF;
  
  -- Organizing committee strength (20 points max)
  SELECT COUNT(*) INTO v_organizing_committee_size
  FROM organizing_contacts
  WHERE campaign_id = p_campaign_id
  AND organizing_committee_member = true;
  
  IF v_organizing_committee_size >= 10 THEN
    v_score := v_score + 20;
  ELSIF v_organizing_committee_size >= 5 THEN
    v_score := v_score + 10;
  ELSIF v_organizing_committee_size >= 3 THEN
    v_score := v_score + 5;
  END IF;
  
  -- Supporter base (20 points max)
  SELECT 
    ROUND((COUNT(*) FILTER (WHERE support_level IN ('strong_supporter', 'supporter'))::DECIMAL 
           / NULLIF(COUNT(*), 0)) * 100, 2)
  INTO v_supporter_percentage
  FROM organizing_contacts
  WHERE campaign_id = p_campaign_id;
  
  IF v_supporter_percentage >= 60 THEN
    v_score := v_score + 20;
  ELSIF v_supporter_percentage >= 40 THEN
    v_score := v_score + 10;
  ELSIF v_supporter_percentage >= 20 THEN
    v_score := v_score + 5;
  END IF;
  
  -- Recent activity (10 points max)
  IF EXISTS (
    SELECT 1 FROM organizing_activities
    WHERE campaign_id = p_campaign_id
    AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
  ) THEN
    v_score := v_score + 10;
  ELSIF EXISTS (
    SELECT 1 FROM organizing_activities
    WHERE campaign_id = p_campaign_id
    AND activity_date >= CURRENT_DATE - INTERVAL '14 days'
  ) THEN
    v_score := v_score + 5;
  END IF;
  
  -- Opposition level (10 points penalty for high resistance)
  IF v_campaign.employer_resistance_level = 'low' THEN
    v_score := v_score + 10;
  ELSIF v_campaign.employer_resistance_level IN ('high', 'extreme') THEN
    v_score := v_score - 10;
  END IF;
  
  -- Ensure score is between 0-100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 7: AGGREGATION VIEWS
-- =====================================================================================

-- View: Campaign dashboard summary
CREATE OR REPLACE VIEW v_organizing_campaign_dashboard AS
SELECT 
  oc.id as campaign_id,
  oc.organization_id,
  oc.campaign_name,
  oc.campaign_code,
  oc.campaign_type,
  oc.campaign_status,
  oc.target_employer_name,
  oc.labor_board_jurisdiction,
  oc.estimated_eligible_workers,
  oc.cards_signed_count,
  oc.cards_signed_percentage,
  oc.card_signing_goal,
  oc.card_signing_threshold_percentage,
  oc.organizing_committee_size,
  oc.campaign_launch_date,
  oc.card_check_deadline,
  -- Contact breakdown
  COUNT(DISTINCT contacts.id) as total_contacts,
  COUNT(DISTINCT contacts.id) FILTER (WHERE contacts.support_level IN ('strong_supporter', 'supporter')) as supporters,
  COUNT(DISTINCT contacts.id) FILTER (WHERE contacts.organizing_committee_member = true) as committee_members,
  COUNT(DISTINCT contacts.id) FILTER (WHERE contacts.card_signed = true AND contacts.card_revoked = false) as cards_signed,
  -- Recent activity
  COUNT(DISTINCT activities.id) FILTER (WHERE activities.activity_date >= CURRENT_DATE - INTERVAL '7 days') as activities_last_7_days,
  COUNT(DISTINCT activities.id) FILTER (WHERE activities.activity_date >= CURRENT_DATE - INTERVAL '30 days') as activities_last_30_days,
  -- Days until deadline
  (oc.card_check_deadline - CURRENT_DATE) as days_until_deadline,
  -- Progress indicators
  CASE 
    WHEN oc.cards_signed_percentage >= oc.super_majority_threshold_percentage THEN 'Strong'
    WHEN oc.cards_signed_percentage >= oc.card_signing_threshold_percentage THEN 'Ready'
    WHEN oc.cards_signed_percentage >= 20 THEN 'Building'
    ELSE 'Early'
  END as campaign_strength
FROM organizing_campaigns oc
LEFT JOIN organizing_contacts contacts ON contacts.campaign_id = oc.id
LEFT JOIN organizing_activities activities ON activities.campaign_id = oc.id
GROUP BY oc.id;

-- View: Workplace contact map (for visualization)
CREATE OR REPLACE VIEW v_workplace_contact_map AS
SELECT 
  oc.id as contact_id,
  oc.campaign_id,
  oc.contact_number,
  oc.department,
  oc.shift,
  oc.support_level,
  oc.organizing_committee_member,
  oc.card_signed,
  oc.natural_leader,
  oc.building_location,
  oc.floor_number,
  oc.workstation_area,
  oc.primary_issues,
  campaigns.campaign_name,
  campaigns.target_employer_name
FROM organizing_contacts oc
JOIN organizing_campaigns campaigns ON campaigns.id = oc.campaign_id
WHERE oc.card_revoked = false;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE organizing_campaigns IS 'Organizing campaigns with workplace mapping, card-check tracking, and NLRB/CIRB certification';
COMMENT ON TABLE organizing_contacts IS 'Workplace contacts (potential members) with encrypted PII and support level tracking';
COMMENT ON TABLE organizing_activities IS 'Organizing activities including house visits, blitzes, meetings, and workplace actions';
COMMENT ON TABLE certification_applications IS 'Labor board certification applications with hearing/vote/decision tracking';
COMMENT ON TABLE organizing_volunteers IS 'Volunteer organizers with skills, availability, and assignment tracking';

COMMENT ON FUNCTION update_campaign_card_count IS 'Updates campaign card signing count and percentage from contacts';
COMMENT ON FUNCTION calculate_campaign_health_score IS 'Calculates campaign health score (0-100) based on multiple factors';

COMMENT ON VIEW v_organizing_campaign_dashboard IS 'Campaign dashboard with real-time metrics and progress indicators';
COMMENT ON VIEW v_workplace_contact_map IS 'Workplace contact map for visualization with support levels and committee status';
