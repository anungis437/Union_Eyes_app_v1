-- 003_claims_system.sql
-- Claims Management System Schema
-- This migration creates tables and types for the union grievance claims system

-- Create custom ENUM types for claims (in public schema)
CREATE TYPE claim_status AS ENUM (
    'submitted',
    'under_review',
    'assigned',
    'investigation',
    'pending_documentation',
    'resolved',
    'rejected',
    'closed'
);

CREATE TYPE claim_priority AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE claim_type AS ENUM (
    'grievance_discipline',
    'grievance_schedule',
    'grievance_pay',
    'workplace_safety',
    'discrimination_age',
    'discrimination_gender',
    'discrimination_race',
    'discrimination_disability',
    'discrimination_other',
    'harassment_sexual',
    'harassment_workplace',
    'wage_dispute',
    'contract_dispute',
    'retaliation',
    'wrongful_termination',
    'other'
);

-- Create claims table (in public schema)
CREATE TABLE claims (
    claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    member_id UUID NOT NULL,
    is_anonymous BOOLEAN DEFAULT true,
    
    -- Claim Details
    claim_type claim_type NOT NULL,
    status claim_status DEFAULT 'submitted',
    priority claim_priority DEFAULT 'medium',
    
    -- Incident Information
    incident_date DATE NOT NULL,
    location VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    desired_outcome TEXT NOT NULL,
    
    -- Witness Information
    witnesses_present BOOLEAN DEFAULT false,
    witness_details TEXT,
    
    -- Previous Reports
    previously_reported BOOLEAN DEFAULT false,
    previous_report_details TEXT,
    
    -- Assignment
    assigned_to UUID,
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- AI Analysis
    ai_score INTEGER,
    ai_analysis JSONB,
    merit_confidence INTEGER,
    precedent_match INTEGER,
    complexity_score INTEGER,
    
    -- Progress
    progress INTEGER DEFAULT 0,
    
    -- Attachments and Media
    attachments JSONB DEFAULT '[]'::jsonb,
    voice_transcriptions JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Key Constraints (referencing tenant_management and user_management schemas)
    CONSTRAINT fk_claims_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenant_management.tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_claims_member FOREIGN KEY (member_id) 
        REFERENCES user_management.users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_claims_assigned_to FOREIGN KEY (assigned_to) 
        REFERENCES user_management.users(user_id) ON DELETE SET NULL,
    
    -- Check Constraints
    CONSTRAINT check_progress_range CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT check_ai_score_range CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
    CONSTRAINT check_merit_confidence_range CHECK (merit_confidence IS NULL OR (merit_confidence >= 0 AND merit_confidence <= 100)),
    CONSTRAINT check_precedent_match_range CHECK (precedent_match IS NULL OR (precedent_match >= 0 AND precedent_match <= 100)),
    CONSTRAINT check_complexity_score_range CHECK (complexity_score IS NULL OR (complexity_score >= 0 AND complexity_score <= 10))
);

-- Create claim_updates table for activity tracking (in public schema)
CREATE TABLE claim_updates (
    update_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL,
    update_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_by UUID NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_claim_updates_claim FOREIGN KEY (claim_id) 
        REFERENCES claims(claim_id) ON DELETE CASCADE,
    CONSTRAINT fk_claim_updates_user FOREIGN KEY (created_by) 
        REFERENCES user_management.users(user_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_tenant_id ON claims(tenant_id);
CREATE INDEX idx_claims_member_id ON claims(member_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_priority ON claims(priority);
CREATE INDEX idx_claims_assigned_to ON claims(assigned_to);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_incident_date ON claims(incident_date DESC);

CREATE INDEX idx_claim_updates_claim_id ON claim_updates(claim_id);
CREATE INDEX idx_claim_updates_created_at ON claim_updates(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_claims_updated_at();

-- Insert sample claims for testing (using existing tenant and user IDs from previous migrations)
-- Note: Replace these with actual tenant_id and user_id from your database
INSERT INTO claims (
    claim_number,
    tenant_id,
    member_id,
    is_anonymous,
    claim_type,
    status,
    priority,
    incident_date,
    location,
    description,
    desired_outcome,
    witnesses_present,
    progress
) VALUES
(
    'CLM-2024-0001',
    (SELECT tenant_id FROM tenant_management.tenants LIMIT 1),
    (SELECT user_id FROM user_management.users LIMIT 1),
    false,
    'workplace_safety',
    'under_review',
    'high',
    '2024-01-15',
    'Manufacturing Floor - Building A',
    'Safety equipment was not provided for the welding operation. I was told to proceed without proper protective gear, which is a clear violation of safety protocols.',
    'I would like proper safety equipment to be provided and for management to acknowledge the safety violation.',
    true,
    30
),
(
    'CLM-2024-0002',
    (SELECT tenant_id FROM tenant_management.tenants LIMIT 1),
    (SELECT user_id FROM user_management.users LIMIT 1),
    true,
    'harassment_workplace',
    'investigation',
    'critical',
    '2024-01-20',
    'Office - 3rd Floor',
    'I have been subjected to repeated verbal harassment from my supervisor. The behavior includes aggressive language and intimidation tactics.',
    'I request that this behavior be stopped immediately and that appropriate disciplinary action be taken.',
    false,
    50
),
(
    'CLM-2024-0003',
    (SELECT tenant_id FROM tenant_management.tenants LIMIT 1),
    (SELECT user_id FROM user_management.users LIMIT 1),
    false,
    'wage_dispute',
    'submitted',
    'medium',
    '2024-01-25',
    'Human Resources Department',
    'I have not received overtime pay for the hours worked beyond my scheduled shift in December 2023. According to our contract, overtime should be paid at 1.5x the regular rate.',
    'I am requesting payment for the unpaid overtime hours (approximately 20 hours).',
    false,
    10
);

-- Insert sample claim updates
INSERT INTO claim_updates (
    claim_id,
    update_type,
    message,
    created_by,
    is_internal
) VALUES
(
    (SELECT claim_id FROM claims WHERE claim_number = 'CLM-2024-0001'),
    'status_change',
    'Claim has been assigned to a case manager for review.',
    (SELECT user_id FROM user_management.users LIMIT 1),
    false
),
(
    (SELECT claim_id FROM claims WHERE claim_number = 'CLM-2024-0002'),
    'comment',
    'Investigation has been initiated. Witness interviews scheduled.',
    (SELECT user_id FROM user_management.users LIMIT 1),
    false
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON claims TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON claim_updates TO PUBLIC;

-- Success message
SELECT 'Claims system schema created successfully!' AS status;
