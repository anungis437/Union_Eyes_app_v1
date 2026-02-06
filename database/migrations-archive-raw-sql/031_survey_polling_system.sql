-- Migration: Survey & Polling System (Phase 5 - Week 2)
-- Description: Complete survey and polling infrastructure with 6 question types
-- Created: December 6, 2025
-- 
-- Features:
-- - Survey creation and management
-- - 6 question types: text, textarea, single_choice, multiple_choice, rating, yes_no
-- - Response collection and tracking
-- - Poll system for quick voting
-- - Results analytics
-- - Anonymous/authenticated responses
-- - RLS policies for tenant isolation

-- =====================================================
-- SURVEYS TABLE
-- =====================================================
-- Main survey entity with metadata
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Survey metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    survey_type VARCHAR(50) NOT NULL DEFAULT 'general', -- general, feedback, poll, assessment, registration
    
    -- Status and lifecycle
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, published, closed, archived
    published_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    
    -- Settings
    allow_anonymous BOOLEAN NOT NULL DEFAULT false,
    allow_multiple_responses BOOLEAN NOT NULL DEFAULT false,
    require_authentication BOOLEAN NOT NULL DEFAULT true,
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    show_results BOOLEAN NOT NULL DEFAULT false, -- show results to respondents after submission
    
    -- Display settings
    welcome_message TEXT,
    thank_you_message TEXT,
    
    -- Tracking
    response_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    completion_rate DECIMAL(5,2), -- percentage
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    CONSTRAINT surveys_title_not_empty CHECK (title <> ''),
    CONSTRAINT surveys_valid_type CHECK (survey_type IN ('general', 'feedback', 'poll', 'assessment', 'registration')),
    CONSTRAINT surveys_valid_status CHECK (status IN ('draft', 'published', 'closed', 'archived'))
);

CREATE INDEX idx_surveys_tenant ON surveys(tenant_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_published ON surveys(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_surveys_closes ON surveys(closes_at) WHERE closes_at IS NOT NULL;

-- =====================================================
-- SURVEY_QUESTIONS TABLE
-- =====================================================
-- Questions with 6 types and configuration
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    
    -- Question content
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- text, textarea, single_choice, multiple_choice, rating, yes_no
    description TEXT,
    
    -- Order and grouping
    order_index INTEGER NOT NULL DEFAULT 0,
    section VARCHAR(255), -- optional section grouping
    
    -- Validation and settings
    required BOOLEAN NOT NULL DEFAULT false,
    
    -- Choice-based questions (single_choice, multiple_choice)
    choices JSONB, -- array of choice objects: [{"id": "opt1", "text": "Option 1", "order": 0}]
    allow_other BOOLEAN NOT NULL DEFAULT false, -- allow "Other" option with text input
    
    -- Multiple choice settings
    min_choices INTEGER, -- minimum selections for multiple_choice
    max_choices INTEGER, -- maximum selections for multiple_choice
    
    -- Rating scale settings
    rating_min INTEGER DEFAULT 1, -- minimum rating (default 1)
    rating_max INTEGER DEFAULT 10, -- maximum rating (default 10)
    rating_min_label VARCHAR(100), -- e.g., "Very Dissatisfied"
    rating_max_label VARCHAR(100), -- e.g., "Very Satisfied"
    
    -- Text input settings
    min_length INTEGER,
    max_length INTEGER,
    placeholder TEXT,
    
    -- Conditional logic (future enhancement)
    show_if JSONB, -- conditions for showing this question: {"questionId": "q1", "answer": "yes"}
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT survey_questions_text_not_empty CHECK (question_text <> ''),
    CONSTRAINT survey_questions_valid_type CHECK (
        question_type IN ('text', 'textarea', 'single_choice', 'multiple_choice', 'rating', 'yes_no')
    ),
    CONSTRAINT survey_questions_rating_range CHECK (
        (question_type = 'rating' AND rating_min IS NOT NULL AND rating_max IS NOT NULL AND rating_max > rating_min)
        OR question_type != 'rating'
    ),
    CONSTRAINT survey_questions_choices_required CHECK (
        (question_type IN ('single_choice', 'multiple_choice') AND choices IS NOT NULL)
        OR question_type NOT IN ('single_choice', 'multiple_choice')
    )
);

CREATE INDEX idx_survey_questions_tenant ON survey_questions(tenant_id);
CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX idx_survey_questions_order ON survey_questions(survey_id, order_index);
CREATE INDEX idx_survey_questions_type ON survey_questions(question_type);

-- =====================================================
-- SURVEY_RESPONSES TABLE
-- =====================================================
-- Response submissions with completion tracking
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    
    -- Respondent info
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if anonymous
    respondent_email VARCHAR(255),
    respondent_name VARCHAR(255),
    
    -- Response status
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, abandoned
    
    -- Tracking
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER, -- total time spent on survey
    
    -- Session tracking
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT survey_responses_valid_status CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    CONSTRAINT survey_responses_completed_timestamp CHECK (
        (status = 'completed' AND completed_at IS NOT NULL)
        OR status != 'completed'
    )
);

CREATE INDEX idx_survey_responses_tenant ON survey_responses(tenant_id);
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user ON survey_responses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_survey_responses_status ON survey_responses(status);
CREATE INDEX idx_survey_responses_completed ON survey_responses(completed_at) WHERE completed_at IS NOT NULL;

-- =====================================================
-- SURVEY_ANSWERS TABLE
-- =====================================================
-- Individual answers to survey questions
CREATE TABLE IF NOT EXISTS survey_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    
    -- Answer data (polymorphic based on question type)
    answer_text TEXT, -- for text, textarea, yes_no (stored as "yes"/"no")
    answer_number DECIMAL(10,2), -- for rating questions
    answer_choices JSONB, -- for single_choice (string), multiple_choice (array of strings)
    answer_other TEXT, -- for "Other" option text
    
    -- Metadata
    answered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT survey_answers_response_question_unique UNIQUE (response_id, question_id)
);

CREATE INDEX idx_survey_answers_tenant ON survey_answers(tenant_id);
CREATE INDEX idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX idx_survey_answers_question ON survey_answers(question_id);

-- =====================================================
-- POLLS TABLE
-- =====================================================
-- Quick polls for rapid feedback
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Poll content
    question TEXT NOT NULL,
    description TEXT,
    
    -- Options (simplified vs surveys)
    options JSONB NOT NULL, -- array of options: [{"id": "opt1", "text": "Yes"}, {"id": "opt2", "text": "No"}]
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, closed, archived
    
    -- Settings
    allow_multiple_votes BOOLEAN NOT NULL DEFAULT false,
    require_authentication BOOLEAN NOT NULL DEFAULT true,
    show_results_before_vote BOOLEAN NOT NULL DEFAULT false,
    
    -- Timing
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closes_at TIMESTAMPTZ,
    
    -- Tracking
    total_votes INTEGER NOT NULL DEFAULT 0,
    unique_voters INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT polls_question_not_empty CHECK (question <> ''),
    CONSTRAINT polls_valid_status CHECK (status IN ('active', 'closed', 'archived')),
    CONSTRAINT polls_options_not_empty CHECK (jsonb_array_length(options) >= 2)
);

CREATE INDEX idx_polls_tenant ON polls(tenant_id);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_published ON polls(published_at);
CREATE INDEX idx_polls_closes ON polls(closes_at) WHERE closes_at IS NOT NULL;

-- =====================================================
-- POLL_VOTES TABLE
-- =====================================================
-- Individual poll votes
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    
    -- Voter info
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    voter_email VARCHAR(255),
    
    -- Vote data
    option_id VARCHAR(50) NOT NULL, -- matches id from poll.options JSONB
    
    -- Session tracking
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    voted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints (one vote per user per poll, unless allow_multiple_votes)
    CONSTRAINT poll_votes_user_poll_unique UNIQUE NULLS NOT DISTINCT (poll_id, user_id)
);

CREATE INDEX idx_poll_votes_tenant ON poll_votes(tenant_id);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user ON poll_votes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_poll_votes_option ON poll_votes(poll_id, option_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- SURVEYS
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY surveys_tenant_isolation ON surveys
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- SURVEY_QUESTIONS
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY survey_questions_tenant_isolation ON survey_questions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- SURVEY_RESPONSES
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY survey_responses_tenant_isolation ON survey_responses
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- SURVEY_ANSWERS
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY survey_answers_tenant_isolation ON survey_answers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- POLLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY polls_tenant_isolation ON polls
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- POLL_VOTES
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_votes_tenant_isolation ON poll_votes
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update survey response count when responses are added
CREATE OR REPLACE FUNCTION update_survey_response_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE surveys
        SET response_count = response_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.survey_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
        UPDATE surveys
        SET response_count = response_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.survey_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE surveys
        SET response_count = response_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.survey_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
        UPDATE surveys
        SET response_count = response_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.survey_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_survey_response_count
    AFTER INSERT OR UPDATE OR DELETE ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_response_count();

-- Update poll vote counts
CREATE OR REPLACE FUNCTION update_poll_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE polls
        SET total_votes = total_votes + 1,
            unique_voters = (
                SELECT COUNT(DISTINCT COALESCE(user_id::text, ip_address::text))
                FROM poll_votes
                WHERE poll_id = NEW.poll_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.poll_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE polls
        SET total_votes = total_votes - 1,
            unique_voters = (
                SELECT COUNT(DISTINCT COALESCE(user_id::text, ip_address::text))
                FROM poll_votes
                WHERE poll_id = OLD.poll_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.poll_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_poll_vote_count
    AFTER INSERT OR DELETE ON poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_vote_count();

-- Update timestamps on update
CREATE OR REPLACE FUNCTION update_survey_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_surveys_timestamp
    BEFORE UPDATE ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_timestamps();

CREATE TRIGGER trigger_update_survey_questions_timestamp
    BEFORE UPDATE ON survey_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_timestamps();

CREATE TRIGGER trigger_update_survey_responses_timestamp
    BEFORE UPDATE ON survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_timestamps();

CREATE TRIGGER trigger_update_polls_timestamp
    BEFORE UPDATE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_timestamps();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE surveys IS 'Survey definitions with metadata and settings';
COMMENT ON TABLE survey_questions IS 'Survey questions supporting 6 types: text, textarea, single_choice, multiple_choice, rating, yes_no';
COMMENT ON TABLE survey_responses IS 'Survey response submissions with completion tracking';
COMMENT ON TABLE survey_answers IS 'Individual answers to survey questions';
COMMENT ON TABLE polls IS 'Quick polls for rapid member feedback';
COMMENT ON TABLE poll_votes IS 'Individual poll votes with duplicate prevention';

COMMENT ON COLUMN surveys.survey_type IS 'Survey category: general, feedback, poll, assessment, registration';
COMMENT ON COLUMN surveys.allow_anonymous IS 'Allow responses without authentication';
COMMENT ON COLUMN surveys.show_results IS 'Show results to respondents after submission';
COMMENT ON COLUMN survey_questions.question_type IS 'Question type: text, textarea, single_choice, multiple_choice, rating, yes_no';
COMMENT ON COLUMN survey_questions.choices IS 'JSON array of choice objects for choice-based questions';
COMMENT ON COLUMN survey_questions.rating_min IS 'Minimum rating value (default 1)';
COMMENT ON COLUMN survey_questions.rating_max IS 'Maximum rating value (default 10)';
COMMENT ON COLUMN survey_responses.time_spent_seconds IS 'Total time respondent spent completing survey';
COMMENT ON COLUMN survey_answers.answer_choices IS 'JSON for single_choice (string) or multiple_choice (array)';
COMMENT ON COLUMN polls.options IS 'JSON array of poll options';
COMMENT ON COLUMN poll_votes.option_id IS 'Selected option ID from poll.options';
