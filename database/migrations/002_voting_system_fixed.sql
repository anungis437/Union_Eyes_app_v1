-- Voting System Database Schema (Fixed)
-- Union Claims Management System - Voting Module
-- Supports anonymous voting for conventions and ratification meetings

-- ===============================================
-- VOTING SYSTEM TABLES
-- ===============================================

-- Voting sessions table
CREATE TABLE IF NOT EXISTS voting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('convention', 'ratification', 'special_vote')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'cancelled')),
    meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('convention', 'ratification', 'emergency', 'special')),
    organization_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    allow_anonymous BOOLEAN DEFAULT true,
    requires_quorum BOOLEAN DEFAULT true,
    quorum_threshold INTEGER DEFAULT 50 CHECK (quorum_threshold >= 0 AND quorum_threshold <= 100),
    total_eligible_voters INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
    CONSTRAINT valid_scheduled_end CHECK (scheduled_end_time IS NULL OR scheduled_end_time > created_at)
);

-- Voting options table
CREATE TABLE IF NOT EXISTS voting_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
    text VARCHAR(500) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, order_index)
);

-- Voter eligibility table
CREATE TABLE IF NOT EXISTS voter_eligibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL,
    is_eligible BOOLEAN DEFAULT true,
    eligibility_reason TEXT,
    voting_weight DECIMAL(5,2) DEFAULT 1.0,
    can_delegate BOOLEAN DEFAULT false,
    delegated_to UUID,
    restrictions TEXT[],
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    voter_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, member_id)
);

-- Votes table (anonymized)
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES voting_options(id) ON DELETE CASCADE,
    voter_id VARCHAR(100) NOT NULL, -- Anonymized voter identifier
    voter_hash VARCHAR(100), -- Hash for verification without revealing identity
    cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_anonymous BOOLEAN DEFAULT true,
    voter_type VARCHAR(20) DEFAULT 'member' CHECK (voter_type IN ('member', 'delegate', 'officer', 'guest')),
    voter_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Prevent double voting (one vote per session per anonymized voter)
    UNIQUE(session_id, voter_id)
);

-- Voting notifications table
CREATE TABLE IF NOT EXISTS voting_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('session_started', 'session_ending', 'results_available', 'quorum_reached', 'vote_reminder')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    recipient_id UUID NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    delivery_method TEXT[] DEFAULT ARRAY['push'],
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Voting audit log table (fixed - indexes created separately)
CREATE TABLE IF NOT EXISTS voting_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT
);

-- Organization protocols table (for standardization)
CREATE TABLE IF NOT EXISTS organization_protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    type VARCHAR(50) NOT NULL CHECK (type IN ('voting', 'meeting', 'ratification', 'governance')),
    is_active BOOLEAN DEFAULT true,
    is_national BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(organization_id, name, version)
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Voting sessions indexes
CREATE INDEX IF NOT EXISTS idx_voting_sessions_org_status ON voting_sessions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_type_status ON voting_sessions(type, status);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_start_time ON voting_sessions(start_time) WHERE start_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voting_sessions_created_by ON voting_sessions(created_by);

-- Voting options indexes
CREATE INDEX IF NOT EXISTS idx_voting_options_session ON voting_options(session_id, order_index);

-- Voter eligibility indexes
CREATE INDEX IF NOT EXISTS idx_voter_eligibility_session ON voter_eligibility(session_id);
CREATE INDEX IF NOT EXISTS idx_voter_eligibility_member ON voter_eligibility(member_id);
CREATE INDEX IF NOT EXISTS idx_voter_eligibility_eligible ON voter_eligibility(session_id, is_eligible) WHERE is_eligible = true;

-- Votes indexes
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_option ON votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_cast_time ON votes(cast_at);
CREATE INDEX IF NOT EXISTS idx_votes_session_option ON votes(session_id, option_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_voting_notifications_recipient ON voting_notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_voting_notifications_session ON voting_notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_voting_notifications_type ON voting_notifications(type);

-- Voting audit log indexes (now created separately)
CREATE INDEX IF NOT EXISTS idx_voting_audit_session_time ON voting_audit_logs(session_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_voting_audit_action ON voting_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_voting_audit_performer ON voting_audit_logs(performed_by);

-- Protocols indexes
CREATE INDEX IF NOT EXISTS idx_organization_protocols_org ON organization_protocols(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_organization_protocols_type ON organization_protocols(type, is_active);
CREATE INDEX IF NOT EXISTS idx_organization_protocols_national ON organization_protocols(is_national, is_active) WHERE is_national = true;

-- ===============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===============================================

-- Apply update triggers
CREATE TRIGGER update_voting_sessions_updated_at 
    BEFORE UPDATE ON voting_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voter_eligibility_updated_at 
    BEFORE UPDATE ON voter_eligibility 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_protocols_updated_at 
    BEFORE UPDATE ON organization_protocols 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE voting_sessions IS 'Voting sessions for union conventions and ratification';
COMMENT ON TABLE votes IS 'Anonymized voting records to protect voter privacy';
