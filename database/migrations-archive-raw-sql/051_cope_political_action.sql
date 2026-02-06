-- Migration: COPE Political Action Enhancement
-- Description: Political action campaigns, legislative tracking, elected official engagement, member advocacy
-- Phase: 3 - Strategic CLC Features
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: POLITICAL ACTION CAMPAIGNS
-- =====================================================================================

-- Campaign types
DROP TYPE IF EXISTS political_campaign_type CASCADE;
CREATE TYPE political_campaign_type AS ENUM (
  'electoral', -- Supporting candidates
  'legislative', -- Bill/law advocacy
  'issue_advocacy', -- Single issue campaign
  'ballot_initiative', -- Referendum/proposition
  'get_out_the_vote', -- GOTV
  'voter_registration',
  'political_education',
  'coalition_building'
);

-- Campaign status
DROP TYPE IF EXISTS political_campaign_status CASCADE;
CREATE TYPE political_campaign_status AS ENUM (
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled'
);

-- Political action campaigns
CREATE TABLE IF NOT EXISTS political_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Campaign basics
  campaign_name VARCHAR(300) NOT NULL,
  campaign_code VARCHAR(50) UNIQUE NOT NULL,
  campaign_type political_campaign_type NOT NULL,
  campaign_status political_campaign_status DEFAULT 'planning',
  
  -- Description
  campaign_description TEXT,
  campaign_goals TEXT,
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  election_date DATE, -- For electoral campaigns
  
  -- Jurisdiction
  jurisdiction_level VARCHAR(50), -- federal, provincial, municipal
  jurisdiction_name VARCHAR(200), -- "Federal", "Ontario", "Toronto"
  
  -- Electoral district (for electoral campaigns)
  electoral_district VARCHAR(200), -- "Toronto-Danforth", "Outremont"
  
  -- Legislative focus (for legislative campaigns)
  bill_number VARCHAR(50),
  bill_name VARCHAR(300),
  bill_status VARCHAR(100),
  bill_url TEXT,
  
  -- Issue focus (for issue campaigns)
  primary_issue VARCHAR(200), -- "healthcare", "labor_rights", "minimum_wage"
  secondary_issues JSONB,
  
  -- Target metrics
  member_participation_goal INTEGER,
  volunteer_hours_goal INTEGER,
  doors_knocked_goal INTEGER,
  phone_calls_goal INTEGER,
  petition_signatures_goal INTEGER,
  
  -- Current progress
  members_participated INTEGER DEFAULT 0,
  volunteer_hours_logged INTEGER DEFAULT 0,
  doors_knocked INTEGER DEFAULT 0,
  phone_calls_made INTEGER DEFAULT 0,
  petition_signatures_collected INTEGER DEFAULT 0,
  
  -- Budget
  budget_allocated DECIMAL(12,2),
  expenses_to_date DECIMAL(12,2) DEFAULT 0.00,
  
  -- COPE funding
  funded_by_cope BOOLEAN DEFAULT false,
  cope_contribution_amount DECIMAL(12,2),
  
  -- Coalition partners
  coalition_partners JSONB, -- Array of {name, contact, role}
  
  -- Outcome
  outcome_type VARCHAR(100), -- won, lost, bill_passed, bill_defeated, ongoing
  outcome_date DATE,
  outcome_notes TEXT,
  
  -- Documents
  campaign_plan_url TEXT,
  campaign_materials_urls JSONB,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_political_campaigns_org ON political_campaigns(organization_id);
CREATE INDEX idx_political_campaigns_status ON political_campaigns(campaign_status);
CREATE INDEX idx_political_campaigns_type ON political_campaigns(campaign_type);
CREATE INDEX idx_political_campaigns_jurisdiction ON political_campaigns(jurisdiction_level, jurisdiction_name);

-- RLS policies
ALTER TABLE political_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_political_campaigns ON political_campaigns;
CREATE POLICY select_political_campaigns ON political_campaigns
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_political_campaigns ON political_campaigns;
CREATE POLICY manage_political_campaigns ON political_campaigns
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'political_action_coordinator')
  );

-- =====================================================================================
-- PART 2: ELECTED OFFICIALS & GOVERNMENT CONTACTS
-- =====================================================================================

-- Office level
DROP TYPE IF EXISTS government_level CASCADE;
CREATE TYPE government_level AS ENUM (
  'federal',
  'provincial_territorial',
  'municipal',
  'school_board',
  'regional'
);

-- Political party
DROP TYPE IF EXISTS political_party CASCADE;
CREATE TYPE political_party AS ENUM (
  'liberal',
  'conservative',
  'ndp',
  'green',
  'bloc_quebecois',
  'peoples_party',
  'independent',
  'other'
);

-- Elected officials tracking
CREATE TABLE IF NOT EXISTS elected_officials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Official details
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200),
  preferred_name VARCHAR(200),
  honorific VARCHAR(50), -- "The Honourable", "MP", "MPP", "Councillor"
  
  -- Position
  office_title VARCHAR(200), -- "Member of Parliament", "Senator", "Mayor"
  government_level government_level NOT NULL,
  jurisdiction VARCHAR(200), -- "Canada", "Ontario", "Toronto"
  
  -- Electoral district
  electoral_district VARCHAR(200),
  district_number VARCHAR(50),
  
  -- Political affiliation
  political_party political_party,
  party_caucus_role VARCHAR(100), -- "Leader", "Whip", "Critic"
  
  -- Contact information
  parliament_hill_office_phone VARCHAR(50),
  parliament_hill_office_address TEXT,
  constituency_office_phone VARCHAR(50),
  constituency_office_address TEXT,
  email VARCHAR(255),
  website_url TEXT,
  
  -- Social media
  twitter_handle VARCHAR(100),
  facebook_url TEXT,
  linkedin_url TEXT,
  
  -- Staff contacts
  chief_of_staff_name VARCHAR(200),
  chief_of_staff_email VARCHAR(255),
  chief_of_staff_phone VARCHAR(50),
  legislative_assistant_name VARCHAR(200),
  legislative_assistant_email VARCHAR(255),
  
  -- Committee memberships
  committee_memberships JSONB, -- Array of {committee_name, role, start_date}
  
  -- Portfolio/critic areas
  cabinet_position VARCHAR(200),
  critic_portfolios JSONB, -- Array of portfolio areas
  
  -- Term
  first_elected_date DATE,
  current_term_start_date DATE,
  current_term_end_date DATE,
  previous_terms_count INTEGER DEFAULT 0,
  
  -- Labor relationship
  labor_friendly_rating INTEGER, -- 0-10 scale
  previous_union_member BOOLEAN DEFAULT false,
  previous_union_name VARCHAR(200),
  
  -- Voting record on labor issues
  voted_for_labor_bills INTEGER DEFAULT 0,
  voted_against_labor_bills INTEGER DEFAULT 0,
  
  -- Engagement tracking
  last_contact_date DATE,
  total_meetings_held INTEGER DEFAULT 0,
  total_letters_sent INTEGER DEFAULT 0,
  responsive BOOLEAN,
  responsiveness_notes TEXT,
  
  -- Election support
  union_endorsed BOOLEAN DEFAULT false,
  union_contribution_amount DECIMAL(10,2),
  volunteers_provided INTEGER DEFAULT 0,
  
  -- Status
  is_current BOOLEAN DEFAULT true,
  defeat_date DATE,
  retirement_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_elected_officials_org ON elected_officials(organization_id);
CREATE INDEX idx_elected_officials_level ON elected_officials(government_level);
CREATE INDEX idx_elected_officials_district ON elected_officials(electoral_district);
CREATE INDEX idx_elected_officials_party ON elected_officials(political_party);
CREATE INDEX idx_elected_officials_current ON elected_officials(is_current);

-- RLS policies
ALTER TABLE elected_officials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_elected_officials ON elected_officials;
CREATE POLICY select_elected_officials ON elected_officials
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_elected_officials ON elected_officials;
CREATE POLICY manage_elected_officials ON elected_officials
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'political_action_coordinator')
  );

-- =====================================================================================
-- PART 3: LEGISLATIVE TRACKING
-- =====================================================================================

-- Bill status
DROP TYPE IF EXISTS bill_status CASCADE;
CREATE TYPE bill_status AS ENUM (
  'introduced',
  'first_reading',
  'second_reading',
  'committee_review',
  'third_reading',
  'passed_house',
  'senate_review',
  'royal_assent',
  'enacted',
  'defeated',
  'withdrawn'
);

-- Union position
DROP TYPE IF EXISTS union_position CASCADE;
CREATE TYPE union_position AS ENUM (
  'strong_support',
  'support',
  'neutral',
  'oppose',
  'strong_oppose',
  'monitoring'
);

-- Legislative tracking
CREATE TABLE IF NOT EXISTS legislation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Bill identification
  bill_number VARCHAR(50) NOT NULL,
  bill_title VARCHAR(500) NOT NULL,
  short_title VARCHAR(200),
  
  -- Jurisdiction
  government_level government_level NOT NULL,
  jurisdiction VARCHAR(200),
  legislative_session VARCHAR(100),
  
  -- Bill details
  bill_type VARCHAR(50), -- government_bill, private_members_bill, senate_bill
  sponsor_name VARCHAR(200),
  sponsor_party political_party,
  sponsor_official_id UUID REFERENCES elected_officials(id),
  
  -- Content
  bill_summary TEXT,
  impact_on_labor TEXT,
  key_provisions TEXT,
  
  -- Status
  current_status bill_status DEFAULT 'introduced',
  introduction_date DATE,
  first_reading_date DATE,
  second_reading_date DATE,
  committee_referral_date DATE,
  committee_name VARCHAR(200),
  third_reading_date DATE,
  passed_date DATE,
  royal_assent_date DATE,
  
  -- Union position
  union_position union_position DEFAULT 'monitoring',
  position_rationale TEXT,
  
  -- Campaign
  active_campaign BOOLEAN DEFAULT false,
  campaign_id UUID REFERENCES political_campaigns(id),
  
  -- Lobbying efforts
  committee_presentation_scheduled BOOLEAN DEFAULT false,
  committee_presentation_date DATE,
  written_submission_filed BOOLEAN DEFAULT false,
  written_submission_url TEXT,
  
  -- Member mobilization
  members_contacted_mp INTEGER DEFAULT 0,
  letters_sent_to_mps INTEGER DEFAULT 0,
  petition_signatures INTEGER DEFAULT 0,
  
  -- Amendments
  amendments_proposed JSONB, -- Array of {amendment_text, sponsor, status}
  amendments_adopted INTEGER DEFAULT 0,
  
  -- Coalition work
  coalition_partners JSONB,
  
  -- Outcome
  final_outcome VARCHAR(100),
  outcome_date DATE,
  outcome_impact_assessment TEXT,
  
  -- Documents
  bill_text_url TEXT,
  legislative_summary_url TEXT,
  committee_report_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_legislation_tracking_org ON legislation_tracking(organization_id);
CREATE INDEX idx_legislation_tracking_bill ON legislation_tracking(bill_number);
CREATE INDEX idx_legislation_tracking_status ON legislation_tracking(current_status);
CREATE INDEX idx_legislation_tracking_position ON legislation_tracking(union_position);
CREATE INDEX idx_legislation_tracking_campaign ON legislation_tracking(campaign_id);

-- RLS policies
ALTER TABLE legislation_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_legislation_tracking ON legislation_tracking;
CREATE POLICY select_legislation_tracking ON legislation_tracking
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_legislation_tracking ON legislation_tracking;
CREATE POLICY manage_legislation_tracking ON legislation_tracking
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'political_action_coordinator')
  );

-- =====================================================================================
-- PART 4: POLITICAL ENGAGEMENT ACTIVITIES
-- =====================================================================================

-- Activity types
DROP TYPE IF EXISTS political_activity_type CASCADE;
CREATE TYPE political_activity_type AS ENUM (
  'meeting_with_mp',
  'meeting_with_staff',
  'phone_call',
  'letter_writing',
  'email_campaign',
  'petition_drive',
  'lobby_day',
  'town_hall',
  'press_conference',
  'rally',
  'canvassing',
  'phone_banking',
  'door_knocking',
  'social_media_campaign',
  'committee_presentation',
  'delegation'
);

-- Political activities
CREATE TABLE IF NOT EXISTS political_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id UUID REFERENCES political_campaigns(id),
  
  -- Activity details
  activity_type political_activity_type NOT NULL,
  activity_name VARCHAR(200),
  activity_date DATE NOT NULL,
  activity_time TIME,
  
  -- Target
  elected_official_id UUID REFERENCES elected_officials(id),
  elected_official_name VARCHAR(200),
  
  -- Legislation
  legislation_id UUID REFERENCES legislation_tracking(id),
  bill_number VARCHAR(50),
  
  -- Location
  location VARCHAR(300),
  is_virtual BOOLEAN DEFAULT false,
  meeting_link TEXT,
  
  -- Participation
  members_participated JSONB, -- Array of member_ids
  members_count INTEGER DEFAULT 0,
  volunteers_count INTEGER DEFAULT 0,
  
  -- For canvassing/phone banking
  doors_knocked INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  contacts_reached INTEGER DEFAULT 0,
  petition_signatures_collected INTEGER DEFAULT 0,
  
  -- Outcome
  outcome_summary TEXT,
  commitments_received TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Documents
  meeting_notes_url TEXT,
  photos_urls JSONB,
  media_coverage_urls JSONB,
  
  -- Cost
  activity_cost DECIMAL(10,2) DEFAULT 0.00,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_political_activities_org ON political_activities(organization_id);
CREATE INDEX idx_political_activities_campaign ON political_activities(campaign_id);
CREATE INDEX idx_political_activities_official ON political_activities(elected_official_id);
CREATE INDEX idx_political_activities_legislation ON political_activities(legislation_id);
CREATE INDEX idx_political_activities_date ON political_activities(activity_date);

-- RLS policies
ALTER TABLE political_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_political_activities ON political_activities;
CREATE POLICY select_political_activities ON political_activities
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_political_activities ON political_activities;
CREATE POLICY manage_political_activities ON political_activities
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'political_action_coordinator')
  );

-- =====================================================================================
-- PART 5: MEMBER POLITICAL PARTICIPATION
-- =====================================================================================

-- Member political participation tracking
CREATE TABLE IF NOT EXISTS member_political_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- COPE opt-in
  cope_member BOOLEAN DEFAULT false,
  cope_enrollment_date DATE,
  cope_contributions_total DECIMAL(10,2) DEFAULT 0.00,
  
  -- Political engagement level
  engagement_level VARCHAR(50), -- inactive, low, moderate, high, activist
  
  -- Activities participated
  campaigns_participated JSONB, -- Array of campaign_ids
  activities_count INTEGER DEFAULT 0,
  meetings_attended INTEGER DEFAULT 0,
  letters_written INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  hours_volunteered INTEGER DEFAULT 0,
  
  -- Skills
  political_skills JSONB, -- ["canvassing", "phone_banking", "social_media", "public_speaking"]
  
  -- Interests
  issue_interests JSONB, -- ["healthcare", "labor_rights", "climate", "housing"]
  preferred_engagement JSONB, -- ["in_person", "virtual", "social_media", "letter_writing"]
  
  -- Availability
  available_weekdays BOOLEAN DEFAULT false,
  available_evenings BOOLEAN DEFAULT true,
  available_weekends BOOLEAN DEFAULT true,
  
  -- Electoral district
  federal_riding VARCHAR(200),
  provincial_riding VARCHAR(200),
  municipal_ward VARCHAR(200),
  
  -- Voting
  registered_to_vote BOOLEAN,
  voter_registration_verified_date DATE,
  
  -- Training
  political_training_completed BOOLEAN DEFAULT false,
  training_completion_date DATE,
  
  -- Contact preferences
  contact_for_campaigns BOOLEAN DEFAULT true,
  contact_method_preference VARCHAR(50), -- email, phone, text
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_member_political_participation_org ON member_political_participation(organization_id);
CREATE INDEX idx_member_political_participation_member ON member_political_participation(member_id);
CREATE INDEX idx_member_political_participation_cope ON member_political_participation(cope_member);
CREATE INDEX idx_member_political_participation_engagement ON member_political_participation(engagement_level);

-- RLS policies
ALTER TABLE member_political_participation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_member_political_participation ON member_political_participation;
CREATE POLICY select_member_political_participation ON member_political_participation
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS manage_member_political_participation ON member_political_participation;
CREATE POLICY manage_member_political_participation ON member_political_participation
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'political_action_coordinator')
  );

-- =====================================================================================
-- PART 6: AGGREGATION VIEWS
-- =====================================================================================

-- View: Political campaign dashboard
CREATE OR REPLACE VIEW v_political_campaign_dashboard AS
SELECT 
  pc.id as campaign_id,
  pc.organization_id,
  pc.campaign_name,
  pc.campaign_type,
  pc.campaign_status,
  pc.jurisdiction_level,
  pc.start_date,
  pc.end_date,
  pc.election_date,
  -- Progress metrics
  pc.members_participated,
  pc.member_participation_goal,
  ROUND((pc.members_participated::DECIMAL / NULLIF(pc.member_participation_goal, 0)) * 100, 1) as participation_percentage,
  pc.doors_knocked,
  pc.phone_calls_made,
  pc.petition_signatures_collected,
  -- Budget
  pc.budget_allocated,
  pc.expenses_to_date,
  ROUND((pc.expenses_to_date / NULLIF(pc.budget_allocated, 0)) * 100, 1) as budget_used_percentage,
  -- Activities
  COUNT(DISTINCT pa.id) as total_activities,
  COUNT(DISTINCT pa.id) FILTER (WHERE pa.activity_date >= CURRENT_DATE - INTERVAL '7 days') as activities_last_week,
  SUM(pa.doors_knocked) as total_doors_knocked,
  SUM(pa.calls_made) as total_calls_made
FROM political_campaigns pc
LEFT JOIN political_activities pa ON pa.campaign_id = pc.id
GROUP BY pc.id;

-- View: Elected official engagement summary
CREATE OR REPLACE VIEW v_elected_official_engagement AS
SELECT 
  eo.id as official_id,
  eo.organization_id,
  eo.full_name,
  eo.office_title,
  eo.government_level,
  eo.electoral_district,
  eo.political_party,
  eo.labor_friendly_rating,
  -- Engagement metrics
  eo.total_meetings_held,
  eo.last_contact_date,
  COUNT(DISTINCT pa.id) as total_activities,
  COUNT(DISTINCT pa.id) FILTER (WHERE pa.activity_date >= CURRENT_DATE - INTERVAL '90 days') as activities_last_90_days,
  -- Voting record
  eo.voted_for_labor_bills,
  eo.voted_against_labor_bills,
  CASE 
    WHEN (eo.voted_for_labor_bills + eo.voted_against_labor_bills) > 0 
    THEN ROUND((eo.voted_for_labor_bills::DECIMAL / (eo.voted_for_labor_bills + eo.voted_against_labor_bills)) * 100, 1)
    ELSE NULL
  END as labor_support_percentage
FROM elected_officials eo
LEFT JOIN political_activities pa ON pa.elected_official_id = eo.id
WHERE eo.is_current = true
GROUP BY eo.id;

-- View: Legislative priority tracking
CREATE OR REPLACE VIEW v_legislative_priorities AS
SELECT 
  lt.id as legislation_id,
  lt.organization_id,
  lt.bill_number,
  lt.bill_title,
  lt.government_level,
  lt.current_status,
  lt.union_position,
  lt.active_campaign,
  lt.introduction_date,
  -- Mobilization metrics
  lt.members_contacted_mp,
  lt.letters_sent_to_mps,
  lt.petition_signatures,
  -- Campaign link
  pc.campaign_name,
  pc.campaign_status,
  -- Activity count
  COUNT(DISTINCT pa.id) as total_activities,
  MAX(pa.activity_date) as last_activity_date
FROM legislation_tracking lt
LEFT JOIN political_campaigns pc ON pc.id = lt.campaign_id
LEFT JOIN political_activities pa ON pa.legislation_id = lt.id
WHERE lt.current_status NOT IN ('enacted', 'defeated', 'withdrawn')
GROUP BY lt.id, pc.campaign_name, pc.campaign_status;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE political_campaigns IS 'Political action campaigns including electoral, legislative, and issue advocacy';
COMMENT ON TABLE elected_officials IS 'Elected officials tracking with contact info, labor voting record, and engagement history';
COMMENT ON TABLE legislation_tracking IS 'Legislative tracking with union position, lobbying efforts, and member mobilization';
COMMENT ON TABLE political_activities IS 'Political engagement activities including meetings, lobbying, canvassing, and rallies';
COMMENT ON TABLE member_political_participation IS 'Member political participation tracking with COPE enrollment and engagement levels';

COMMENT ON VIEW v_political_campaign_dashboard IS 'Political campaign dashboard with real-time metrics and participation rates';
COMMENT ON VIEW v_elected_official_engagement IS 'Elected official engagement summary with labor voting record and contact history';
COMMENT ON VIEW v_legislative_priorities IS 'Active legislative priorities with mobilization metrics and campaign status';
