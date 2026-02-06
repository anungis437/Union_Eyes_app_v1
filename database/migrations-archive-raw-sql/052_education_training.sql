-- Migration: Education & Training Module
-- Description: Learning management system, course catalog, certifications, steward training, member education
-- Phase: 3 - Strategic CLC Features
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: COURSE CATALOG
-- =====================================================================================

-- Course category
DROP TYPE IF EXISTS course_category CASCADE;
CREATE TYPE course_category AS ENUM (
  'steward_training',
  'leadership_development',
  'health_and_safety',
  'collective_bargaining',
  'grievance_handling',
  'labor_law',
  'political_action',
  'organizing',
  'equity_and_inclusion',
  'financial_literacy',
  'workplace_rights',
  'public_speaking',
  'conflict_resolution',
  'meeting_facilitation',
  'member_engagement',
  'general'
);

-- Course delivery method
DROP TYPE IF EXISTS course_delivery_method CASCADE;
CREATE TYPE course_delivery_method AS ENUM (
  'in_person',
  'virtual_live', -- Live online
  'self_paced_online',
  'hybrid', -- Mix of in-person and online
  'webinar',
  'workshop',
  'conference_session'
);

-- Course difficulty
DROP TYPE IF EXISTS course_difficulty CASCADE;
CREATE TYPE course_difficulty AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'all_levels'
);

-- Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Course basics
  course_code VARCHAR(50) UNIQUE NOT NULL,
  course_name VARCHAR(300) NOT NULL,
  course_description TEXT,
  course_category course_category NOT NULL,
  
  -- Delivery
  delivery_method course_delivery_method NOT NULL,
  course_difficulty course_difficulty DEFAULT 'all_levels',
  
  -- Duration
  duration_hours DECIMAL(5,2), -- Total course hours
  duration_days INTEGER, -- For multi-day courses
  
  -- Prerequisites
  has_prerequisites BOOLEAN DEFAULT false,
  prerequisite_courses JSONB, -- Array of course_ids
  prerequisite_certifications JSONB, -- Array of certification names
  
  -- Content
  learning_objectives TEXT,
  course_outline JSONB, -- Array of {module_name, topics, duration}
  
  -- Materials
  course_materials_url TEXT,
  presentation_slides_url TEXT,
  workbook_url TEXT,
  additional_resources JSONB, -- Array of {name, url}
  
  -- Instructors
  primary_instructor_name VARCHAR(200),
  instructor_ids JSONB, -- Array of user_ids
  
  -- Capacity
  min_enrollment INTEGER DEFAULT 5,
  max_enrollment INTEGER DEFAULT 30,
  
  -- Certification
  provides_certification BOOLEAN DEFAULT false,
  certification_name VARCHAR(200),
  certification_valid_years INTEGER, -- Years before renewal required
  
  -- CLC requirements
  clc_approved BOOLEAN DEFAULT false,
  clc_approval_date DATE,
  clc_course_code VARCHAR(50),
  
  -- Cost
  course_fee DECIMAL(10,2) DEFAULT 0.00,
  materials_fee DECIMAL(10,2) DEFAULT 0.00,
  travel_subsidy_available BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT false, -- For certain roles
  mandatory_for_roles JSONB, -- Array of role names
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_training_courses_org ON training_courses(organization_id);
CREATE INDEX idx_training_courses_category ON training_courses(course_category);
CREATE INDEX idx_training_courses_active ON training_courses(is_active);
CREATE INDEX idx_training_courses_clc ON training_courses(clc_approved);

-- RLS policies
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_training_courses ON training_courses;
CREATE POLICY select_training_courses ON training_courses
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_training_courses ON training_courses;
CREATE POLICY manage_training_courses ON training_courses
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'education_coordinator', 'training_coordinator')
  );

-- =====================================================================================
-- PART 2: COURSE SESSIONS & SCHEDULING
-- =====================================================================================

-- Session status
DROP TYPE IF EXISTS session_status CASCADE;
CREATE TYPE session_status AS ENUM (
  'scheduled',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled'
);

-- Course sessions (specific offerings of courses)
CREATE TABLE IF NOT EXISTS course_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  course_id UUID NOT NULL REFERENCES training_courses(id),
  
  -- Session details
  session_code VARCHAR(50) UNIQUE NOT NULL,
  session_name VARCHAR(300),
  
  -- Scheduling
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  session_times JSONB, -- Array of {date, start_time, end_time} for each day
  
  -- Location
  delivery_method course_delivery_method NOT NULL,
  venue_name VARCHAR(200),
  venue_address TEXT,
  room_number VARCHAR(50),
  virtual_meeting_url TEXT,
  virtual_meeting_access_code VARCHAR(50),
  
  -- Instructors
  lead_instructor_id UUID,
  lead_instructor_name VARCHAR(200),
  co_instructors JSONB, -- Array of {user_id, name}
  
  -- Registration
  registration_open_date DATE,
  registration_close_date DATE,
  registration_count INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,
  max_enrollment INTEGER,
  
  -- Status
  session_status session_status DEFAULT 'scheduled',
  
  -- Completion tracking
  attendees_count INTEGER DEFAULT 0,
  completions_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),
  
  -- Evaluation
  average_rating DECIMAL(3,2), -- 0-5 scale
  evaluation_responses_count INTEGER DEFAULT 0,
  
  -- Cost
  session_budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- Travel
  travel_subsidy_offered BOOLEAN DEFAULT false,
  accommodation_arranged BOOLEAN DEFAULT false,
  accommodation_hotel VARCHAR(200),
  
  -- Materials
  materials_prepared BOOLEAN DEFAULT false,
  materials_distributed_count INTEGER DEFAULT 0,
  
  -- Cancellation
  cancellation_reason TEXT,
  cancelled_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_course_sessions_org ON course_sessions(organization_id);
CREATE INDEX idx_course_sessions_course ON course_sessions(course_id);
CREATE INDEX idx_course_sessions_status ON course_sessions(session_status);
CREATE INDEX idx_course_sessions_dates ON course_sessions(start_date, end_date);
CREATE INDEX idx_course_sessions_instructor ON course_sessions(lead_instructor_id);

-- RLS policies
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_course_sessions ON course_sessions;
CREATE POLICY select_course_sessions ON course_sessions
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_course_sessions ON course_sessions;
CREATE POLICY manage_course_sessions ON course_sessions
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'education_coordinator', 'training_coordinator')
  );

-- =====================================================================================
-- PART 3: MEMBER TRAINING RECORDS
-- =====================================================================================

-- Registration status
DROP TYPE IF EXISTS registration_status CASCADE;
CREATE TYPE registration_status AS ENUM (
  'registered',
  'waitlisted',
  'confirmed',
  'attended',
  'completed',
  'incomplete',
  'no_show',
  'cancelled',
  'withdrawn'
);

-- Member course registrations
CREATE TABLE IF NOT EXISTS course_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES members(id),
  course_id UUID NOT NULL REFERENCES training_courses(id),
  session_id UUID NOT NULL REFERENCES course_sessions(id),
  
  -- Registration
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registration_status registration_status DEFAULT 'registered',
  
  -- Approval (if required)
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_date DATE,
  approval_notes TEXT,
  
  -- Attendance
  attended BOOLEAN DEFAULT false,
  attendance_dates JSONB, -- Array of dates attended (for multi-day courses)
  attendance_hours DECIMAL(5,2),
  
  -- Completion
  completed BOOLEAN DEFAULT false,
  completion_date DATE,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Assessment
  pre_test_score DECIMAL(5,2),
  post_test_score DECIMAL(5,2),
  final_grade VARCHAR(10), -- Pass/Fail or letter grade
  passed BOOLEAN,
  
  -- Certificate
  certificate_issued BOOLEAN DEFAULT false,
  certificate_number VARCHAR(100),
  certificate_issue_date DATE,
  certificate_url TEXT,
  
  -- Evaluation
  evaluation_completed BOOLEAN DEFAULT false,
  evaluation_rating DECIMAL(3,2), -- 0-5 scale
  evaluation_comments TEXT,
  evaluation_submitted_date DATE,
  
  -- Travel/accommodation
  travel_required BOOLEAN DEFAULT false,
  travel_subsidy_requested BOOLEAN DEFAULT false,
  travel_subsidy_approved BOOLEAN DEFAULT false,
  travel_subsidy_amount DECIMAL(10,2),
  accommodation_required BOOLEAN DEFAULT false,
  
  -- Fees
  course_fee DECIMAL(10,2) DEFAULT 0.00,
  fee_paid BOOLEAN DEFAULT false,
  fee_payment_date DATE,
  fee_waived BOOLEAN DEFAULT false,
  fee_waiver_reason TEXT,
  
  -- Cancellation
  cancellation_date DATE,
  cancellation_reason TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_course_registrations_org ON course_registrations(organization_id);
CREATE INDEX idx_course_registrations_member ON course_registrations(member_id);
CREATE INDEX idx_course_registrations_course ON course_registrations(course_id);
CREATE INDEX idx_course_registrations_session ON course_registrations(session_id);
CREATE INDEX idx_course_registrations_status ON course_registrations(registration_status);
CREATE INDEX idx_course_registrations_completed ON course_registrations(completed);

-- RLS policies
ALTER TABLE course_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_course_registrations ON course_registrations;
CREATE POLICY select_course_registrations ON course_registrations
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS manage_course_registrations ON course_registrations;
CREATE POLICY manage_course_registrations ON course_registrations
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'education_coordinator', 'training_coordinator')
  );

-- =====================================================================================
-- PART 4: CERTIFICATIONS & CREDENTIALS
-- =====================================================================================

-- Certification status
DROP TYPE IF EXISTS certification_status CASCADE;
CREATE TYPE certification_status AS ENUM (
  'active',
  'expiring_soon', -- Within 90 days
  'expired',
  'revoked',
  'suspended'
);

-- Member certifications
CREATE TABLE IF NOT EXISTS member_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES members(id),
  
  -- Certification details
  certification_name VARCHAR(200) NOT NULL,
  certification_type VARCHAR(100), -- steward, health_safety, first_aid, trainer, grievance_officer
  
  -- Issuing body
  issued_by_organization VARCHAR(200), -- CLC, UFCW Canada, Canadian Labour Congress, etc.
  certification_number VARCHAR(100) UNIQUE,
  
  -- Dates
  issue_date DATE NOT NULL,
  expiry_date DATE,
  valid_years INTEGER,
  
  -- Status
  certification_status certification_status DEFAULT 'active',
  
  -- Associated course
  course_id UUID REFERENCES training_courses(id),
  session_id UUID REFERENCES course_sessions(id),
  registration_id UUID REFERENCES course_registrations(id),
  
  -- Renewal
  renewal_required BOOLEAN DEFAULT false,
  renewal_date DATE,
  renewal_course_id UUID REFERENCES training_courses(id),
  
  -- Verification
  verified BOOLEAN DEFAULT true,
  verification_date DATE,
  verified_by UUID,
  
  -- Certificate document
  certificate_url TEXT,
  digital_badge_url TEXT,
  
  -- CLC registry
  clc_registered BOOLEAN DEFAULT false,
  clc_registration_number VARCHAR(100),
  clc_registration_date DATE,
  
  -- Revocation
  revoked BOOLEAN DEFAULT false,
  revocation_date DATE,
  revocation_reason TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_member_certifications_org ON member_certifications(organization_id);
CREATE INDEX idx_member_certifications_member ON member_certifications(member_id);
CREATE INDEX idx_member_certifications_status ON member_certifications(certification_status);
CREATE INDEX idx_member_certifications_type ON member_certifications(certification_type);
CREATE INDEX idx_member_certifications_expiry ON member_certifications(expiry_date);

-- RLS policies
ALTER TABLE member_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_member_certifications ON member_certifications;
CREATE POLICY select_member_certifications ON member_certifications
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS manage_member_certifications ON member_certifications;
CREATE POLICY manage_member_certifications ON member_certifications
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'education_coordinator')
  );

-- =====================================================================================
-- PART 5: TRAINING PATHS & PROGRAMS
-- =====================================================================================

-- Training program (structured sequence of courses)
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Program details
  program_name VARCHAR(300) NOT NULL,
  program_code VARCHAR(50) UNIQUE NOT NULL,
  program_description TEXT,
  program_category VARCHAR(100), -- steward_development, leadership_academy, health_safety
  
  -- Structure
  required_courses JSONB, -- Array of {course_id, sequence_number}
  elective_courses JSONB, -- Array of course_ids (choose X of Y)
  electives_required_count INTEGER DEFAULT 0,
  total_hours_required DECIMAL(6,2),
  
  -- Duration
  program_duration_months INTEGER,
  
  -- Certification
  provides_certification BOOLEAN DEFAULT false,
  certification_name VARCHAR(200),
  
  -- Requirements
  entry_requirements TEXT,
  time_commitment TEXT,
  
  -- CLC
  clc_approved BOOLEAN DEFAULT false,
  clc_approval_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_training_programs_org ON training_programs(organization_id);
CREATE INDEX idx_training_programs_active ON training_programs(is_active);

-- RLS policies
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_training_programs ON training_programs;
CREATE POLICY select_training_programs ON training_programs
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

DROP POLICY IF EXISTS manage_training_programs ON training_programs;
CREATE POLICY manage_training_programs ON training_programs
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'education_coordinator')
  );

-- Member program enrollment
CREATE TABLE IF NOT EXISTS program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES members(id),
  program_id UUID NOT NULL REFERENCES training_programs(id),
  
  -- Enrollment
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  enrollment_status VARCHAR(50) DEFAULT 'active', -- active, completed, withdrawn, deferred
  
  -- Progress
  courses_completed INTEGER DEFAULT 0,
  courses_required INTEGER,
  hours_completed DECIMAL(6,2) DEFAULT 0.00,
  hours_required DECIMAL(6,2),
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Completion
  completed BOOLEAN DEFAULT false,
  completion_date DATE,
  
  -- Certification
  certification_issued BOOLEAN DEFAULT false,
  certification_id UUID REFERENCES member_certifications(id),
  
  -- Timeline
  expected_completion_date DATE,
  extension_granted BOOLEAN DEFAULT false,
  extended_completion_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_program_enrollments_org ON program_enrollments(organization_id);
CREATE INDEX idx_program_enrollments_member ON program_enrollments(member_id);
CREATE INDEX idx_program_enrollments_program ON program_enrollments(program_id);
CREATE INDEX idx_program_enrollments_status ON program_enrollments(enrollment_status);

-- RLS policies
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_program_enrollments ON program_enrollments;
CREATE POLICY select_program_enrollments ON program_enrollments
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    OR member_id = current_setting('app.current_user_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS manage_program_enrollments ON program_enrollments;
CREATE POLICY manage_program_enrollments ON program_enrollments
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer', 'education_coordinator')
  );

-- =====================================================================================
-- PART 6: FUNCTIONS - TRAINING ANALYTICS
-- =====================================================================================

-- Function: Update member certification status
CREATE OR REPLACE FUNCTION update_certification_status()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Mark certifications as expiring soon (within 90 days)
  UPDATE member_certifications
  SET certification_status = 'expiring_soon'
  WHERE certification_status = 'active'
  AND expiry_date IS NOT NULL
  AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND expiry_date > CURRENT_DATE;
  
  v_updated_count := v_updated_count + (SELECT COUNT(*) FROM member_certifications WHERE certification_status = 'expiring_soon');
  
  -- Mark certifications as expired
  UPDATE member_certifications
  SET certification_status = 'expired'
  WHERE certification_status IN ('active', 'expiring_soon')
  AND expiry_date IS NOT NULL
  AND expiry_date < CURRENT_DATE;
  
  v_updated_count := v_updated_count + (SELECT COUNT(*) FROM member_certifications WHERE certification_status = 'expired');
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate program enrollment progress
CREATE OR REPLACE FUNCTION update_program_enrollment_progress(
  p_enrollment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_enrollment RECORD;
  v_program RECORD;
  v_courses_completed INTEGER;
  v_hours_completed DECIMAL(6,2);
  v_progress_percentage DECIMAL(5,2);
BEGIN
  SELECT * INTO v_enrollment
  FROM program_enrollments
  WHERE id = p_enrollment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Enrollment not found');
  END IF;
  
  SELECT * INTO v_program
  FROM training_programs
  WHERE id = v_enrollment.program_id;
  
  -- Count completed courses
  SELECT COUNT(DISTINCT cr.course_id), COALESCE(SUM(tc.duration_hours), 0)
  INTO v_courses_completed, v_hours_completed
  FROM course_registrations cr
  JOIN training_courses tc ON tc.id = cr.course_id
  WHERE cr.member_id = v_enrollment.member_id
  AND cr.completed = true
  AND (
    cr.course_id = ANY(SELECT jsonb_array_elements_text(v_program.required_courses)::UUID)
    OR cr.course_id = ANY(SELECT jsonb_array_elements_text(v_program.elective_courses)::UUID)
  );
  
  -- Calculate progress
  IF v_program.total_hours_required > 0 THEN
    v_progress_percentage := ROUND((v_hours_completed / v_program.total_hours_required) * 100, 2);
  ELSE
    v_progress_percentage := 0.00;
  END IF;
  
  -- Update enrollment
  UPDATE program_enrollments
  SET 
    courses_completed = v_courses_completed,
    hours_completed = v_hours_completed,
    progress_percentage = v_progress_percentage,
    updated_at = NOW()
  WHERE id = p_enrollment_id;
  
  RETURN jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'courses_completed', v_courses_completed,
    'hours_completed', v_hours_completed,
    'progress_percentage', v_progress_percentage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 7: AGGREGATION VIEWS
-- =====================================================================================

-- View: Member training transcript
CREATE OR REPLACE VIEW v_member_training_transcript AS
SELECT 
  m.id as member_id,
  m.first_name,
  m.last_name,
  cr.organization_id,
  tc.course_name,
  tc.course_category,
  cs.session_code,
  cs.start_date,
  cs.end_date,
  cr.registration_status,
  cr.attended,
  cr.completed,
  cr.completion_date,
  cr.attendance_hours,
  cr.final_grade,
  cr.certificate_issued,
  cr.certificate_number,
  tc.duration_hours,
  tc.provides_certification
FROM members m
JOIN course_registrations cr ON cr.member_id = m.id
JOIN training_courses tc ON tc.id = cr.course_id
JOIN course_sessions cs ON cs.id = cr.session_id
ORDER BY m.id, cs.start_date DESC;

-- View: Course session dashboard
CREATE OR REPLACE VIEW v_course_session_dashboard AS
SELECT 
  cs.id as session_id,
  cs.organization_id,
  tc.course_name,
  tc.course_category,
  cs.session_code,
  cs.start_date,
  cs.end_date,
  cs.session_status,
  cs.max_enrollment,
  -- Registration metrics
  COUNT(DISTINCT cr.id) as total_registrations,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.registration_status IN ('registered', 'confirmed')) as confirmed_registrations,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.registration_status = 'waitlisted') as waitlist_count,
  -- Attendance
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.attended = true) as attendees,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.registration_status = 'no_show') as no_shows,
  -- Completion
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.completed = true) as completions,
  ROUND((COUNT(DISTINCT cr.id) FILTER (WHERE cr.completed = true)::DECIMAL / NULLIF(COUNT(DISTINCT cr.id) FILTER (WHERE cr.attended = true), 0)) * 100, 1) as completion_rate,
  -- Evaluation
  AVG(cr.evaluation_rating) FILTER (WHERE cr.evaluation_completed = true) as avg_rating,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.evaluation_completed = true) as evaluation_count,
  -- Enrollment capacity
  ROUND((COUNT(DISTINCT cr.id) FILTER (WHERE cr.registration_status IN ('registered', 'confirmed'))::DECIMAL / NULLIF(cs.max_enrollment, 0)) * 100, 1) as enrollment_percentage
FROM course_sessions cs
JOIN training_courses tc ON tc.id = cs.course_id
LEFT JOIN course_registrations cr ON cr.session_id = cs.id
GROUP BY cs.id, tc.course_name, tc.course_category;

-- View: Certification expiry tracking
CREATE OR REPLACE VIEW v_certification_expiry_tracking AS
SELECT 
  mc.organization_id,
  m.id as member_id,
  m.first_name,
  m.last_name,
  mc.certification_name,
  mc.certification_type,
  mc.issue_date,
  mc.expiry_date,
  mc.certification_status,
  CASE 
    WHEN mc.expiry_date < CURRENT_DATE THEN 'Expired'
    WHEN mc.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expires in 30 days'
    WHEN mc.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'Expires in 90 days'
    ELSE 'Active'
  END as expiry_alert,
  (mc.expiry_date - CURRENT_DATE) as days_until_expiry,
  mc.renewal_required,
  mc.renewal_course_id
FROM member_certifications mc
JOIN members m ON m.id = mc.member_id
WHERE mc.certification_status IN ('active', 'expiring_soon')
AND mc.expiry_date IS NOT NULL
ORDER BY mc.expiry_date ASC;

-- View: Training program progress
CREATE OR REPLACE VIEW v_training_program_progress AS
SELECT 
  pe.id as enrollment_id,
  pe.organization_id,
  m.id as member_id,
  m.first_name,
  m.last_name,
  tp.program_name,
  tp.program_category,
  pe.enrollment_date,
  pe.enrollment_status,
  pe.courses_completed,
  pe.courses_required,
  pe.hours_completed,
  pe.hours_required,
  pe.progress_percentage,
  pe.expected_completion_date,
  pe.completed,
  pe.completion_date
FROM program_enrollments pe
JOIN members m ON m.id = pe.member_id
JOIN training_programs tp ON tp.id = pe.program_id
WHERE pe.enrollment_status = 'active'
ORDER BY pe.progress_percentage DESC;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE training_courses IS 'Course catalog with categories, delivery methods, certifications, and CLC approval tracking';
COMMENT ON TABLE course_sessions IS 'Scheduled course sessions with registration, attendance, and completion tracking';
COMMENT ON TABLE course_registrations IS 'Member course registrations with attendance, completion, evaluation, and certificate tracking';
COMMENT ON TABLE member_certifications IS 'Member certifications with expiry tracking, renewal requirements, and CLC registry integration';
COMMENT ON TABLE training_programs IS 'Structured training programs (sequences of courses) with certification pathways';
COMMENT ON TABLE program_enrollments IS 'Member enrollment in training programs with progress tracking';

COMMENT ON FUNCTION update_certification_status IS 'Updates certification status based on expiry dates (active → expiring_soon → expired)';
COMMENT ON FUNCTION update_program_enrollment_progress IS 'Calculates and updates program enrollment progress based on completed courses';

COMMENT ON VIEW v_member_training_transcript IS 'Member training transcript with all courses, attendance, and certifications';
COMMENT ON VIEW v_course_session_dashboard IS 'Course session dashboard with registration, attendance, completion, and evaluation metrics';
COMMENT ON VIEW v_certification_expiry_tracking IS 'Certification expiry tracking with alerts for upcoming renewals';
COMMENT ON VIEW v_training_program_progress IS 'Training program progress tracking for active enrollments';
