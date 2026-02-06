-- Migration 008: Enhanced RBAC Schema for Enterprise Unions
-- Created: November 14, 2025
-- Purpose: Support multi-role assignments, term limits, scope-based permissions, and audit trails

-- ============================================================================
-- ROLE DEFINITIONS TABLE
-- Defines available roles in the system (organizational structure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "local_president", "dept_steward"
  role_name VARCHAR(200) NOT NULL, -- Display name: "Local President"
  role_description TEXT,
  role_level INT NOT NULL, -- Hierarchy level for comparison (higher = more authority)
  
  -- Role characteristics
  is_elected BOOLEAN DEFAULT FALSE,
  requires_board_approval BOOLEAN DEFAULT FALSE,
  default_term_years INT, -- e.g., 3 years for elected officers
  can_delegate BOOLEAN DEFAULT FALSE,
  can_have_multiple_holders BOOLEAN DEFAULT TRUE, -- Can multiple people have this role?
  
  -- Hierarchy
  parent_role_code VARCHAR(50) REFERENCES role_definitions(role_code),
  
  -- Permissions (JSON array of permission strings)
  permissions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_system_role BOOLEAN DEFAULT FALSE, -- System roles can't be deleted
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  
  -- Constraints
  CHECK (role_level >= 0),
  CHECK (default_term_years IS NULL OR default_term_years > 0)
);

CREATE INDEX idx_role_definitions_code ON role_definitions(role_code);
CREATE INDEX idx_role_definitions_level ON role_definitions(role_level);
CREATE INDEX idx_role_definitions_active ON role_definitions(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- MEMBER ROLES TABLE
-- Tracks role assignments to members with scope, terms, and temporal data
-- ============================================================================
CREATE TABLE IF NOT EXISTS member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_code VARCHAR(50) NOT NULL REFERENCES role_definitions(role_code),
  
  -- Scope (what subset of org does this role cover?)
  scope_type VARCHAR(50) DEFAULT 'global', -- "global", "department", "location", "shift", "chapter"
  scope_value VARCHAR(200), -- e.g., "Manufacturing", "Plant A", "Night Shift"
  
  -- Temporal tracking
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = indefinite
  term_years INT, -- Length of term if elected
  next_election_date DATE, -- When next election should occur
  
  -- Assignment type
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'appointed', -- "elected", "appointed", "acting", "emergency"
  election_date DATE,
  elected_by VARCHAR(50), -- "membership_vote", "board_vote", "officer_appointment"
  vote_count INT, -- Number of votes received
  total_votes INT, -- Total votes cast
  vote_percentage DECIMAL(5,2), -- Calculated percentage
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'active', -- "active", "expired", "suspended", "pending_approval"
  suspension_reason TEXT,
  suspended_at TIMESTAMP,
  suspended_by UUID,
  
  -- Acting/Delegation
  is_acting_role BOOLEAN DEFAULT FALSE,
  acting_for_member_id UUID REFERENCES organization_members(id),
  acting_reason TEXT, -- "Medical leave", "Vacation", "Emergency"
  acting_start_date DATE,
  acting_end_date DATE,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES organization_members(id),
  approval_date TIMESTAMP,
  approval_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  
  -- Constraints
  CHECK (status IN ('active', 'expired', 'suspended', 'pending_approval')),
  CHECK (assignment_type IN ('elected', 'appointed', 'acting', 'emergency')),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (vote_percentage IS NULL OR (vote_percentage >= 0 AND vote_percentage <= 100)),
  
  -- Unique constraint: One active role per member/tenant/role/scope combination
  UNIQUE(member_id, tenant_id, role_code, scope_type, scope_value, status)
);

-- Indexes for performance
CREATE INDEX idx_member_roles_member ON member_roles(member_id);
CREATE INDEX idx_member_roles_tenant ON member_roles(tenant_id);
CREATE INDEX idx_member_roles_role ON member_roles(role_code);
CREATE INDEX idx_member_roles_status ON member_roles(status);
CREATE INDEX idx_member_roles_active ON member_roles(member_id, tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_member_roles_expiring ON member_roles(end_date) WHERE end_date IS NOT NULL AND status = 'active';
CREATE INDEX idx_member_roles_elections ON member_roles(next_election_date) WHERE next_election_date IS NOT NULL;
CREATE INDEX idx_member_roles_acting ON member_roles(acting_for_member_id) WHERE is_acting_role = TRUE;

-- ============================================================================
-- PERMISSION EXCEPTIONS TABLE
-- Case-by-case permission grants outside normal role hierarchy
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What permission
  permission VARCHAR(100) NOT NULL, -- e.g., "view_claim", "approve_settlement"
  resource_type VARCHAR(50) NOT NULL, -- "claim", "member", "contract", "financial_report"
  resource_id UUID, -- Specific resource ID, NULL = all of type
  
  -- Why granted
  reason TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES organization_members(id),
  approval_date TIMESTAMP DEFAULT NOW(),
  approval_notes TEXT,
  
  -- Temporal
  effective_date DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP, -- NULL = permanent
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES organization_members(id),
  revocation_reason TEXT,
  
  -- Usage tracking
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP,
  usage_limit INT, -- NULL = unlimited
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CHECK (usage_count >= 0),
  CHECK (usage_limit IS NULL OR usage_limit > 0),
  CHECK (expires_at IS NULL OR expires_at > approval_date)
);

-- Indexes
CREATE INDEX idx_permission_exceptions_member ON permission_exceptions(member_id);
CREATE INDEX idx_permission_exceptions_resource ON permission_exceptions(resource_type, resource_id);
CREATE INDEX idx_permission_exceptions_active ON permission_exceptions(is_active, expires_at) 
  WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW());
CREATE INDEX idx_permission_exceptions_expiring ON permission_exceptions(expires_at) 
  WHERE expires_at IS NOT NULL AND is_active = TRUE;

-- ============================================================================
-- RBAC AUDIT LOG TABLE
-- Immutable audit trail for compliance and security monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Who performed the action
  actor_id UUID NOT NULL, -- Member ID
  actor_name VARCHAR(200), -- Snapshot of name at time of action
  actor_role VARCHAR(100), -- Primary role at time of action
  on_behalf_of_id UUID, -- If acting or delegated
  on_behalf_of_name VARCHAR(200),
  
  -- What action
  action VARCHAR(100) NOT NULL, -- "create_claim", "approve_settlement", "view_member", "change_role"
  action_category VARCHAR(50), -- "create", "read", "update", "delete", "approve"
  resource_type VARCHAR(50) NOT NULL, -- "claim", "member", "role_assignment"
  resource_id UUID,
  resource_description TEXT, -- Human-readable description
  
  -- Context
  tenant_id UUID NOT NULL,
  tenant_name VARCHAR(200),
  
  -- Authorization
  required_permission VARCHAR(100), -- Permission that was checked
  granted BOOLEAN NOT NULL, -- Was access granted?
  grant_method VARCHAR(50), -- "role", "exception", "override"
  denial_reason TEXT, -- Why was it denied?
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(200),
  request_id VARCHAR(200), -- For tracing across services
  
  -- Data changes (for update/delete actions)
  old_values JSONB, -- Previous state
  new_values JSONB, -- New state
  changed_fields TEXT[], -- Array of changed field names
  
  -- Immutability chain (blockchain-style)
  record_hash VARCHAR(64) NOT NULL, -- SHA-256 of this record
  previous_hash VARCHAR(64), -- Hash of previous record (for integrity)
  
  -- Performance impact
  execution_time_ms INT, -- How long the action took
  
  -- Compliance flags
  is_sensitive BOOLEAN DEFAULT FALSE, -- High-value action
  requires_review BOOLEAN DEFAULT FALSE, -- Flag for manual review
  reviewed_at TIMESTAMP,
  reviewed_by UUID,
  review_notes TEXT
);

-- Indexes for audit queries
CREATE INDEX idx_audit_timestamp ON rbac_audit_log(timestamp DESC);
CREATE INDEX idx_audit_actor ON rbac_audit_log(actor_id, timestamp DESC);
CREATE INDEX idx_audit_tenant ON rbac_audit_log(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_resource ON rbac_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_action ON rbac_audit_log(action, timestamp DESC);
CREATE INDEX idx_audit_denied ON rbac_audit_log(granted, timestamp DESC) WHERE granted = FALSE;
CREATE INDEX idx_audit_sensitive ON rbac_audit_log(is_sensitive, timestamp DESC) WHERE is_sensitive = TRUE;
CREATE INDEX idx_audit_review ON rbac_audit_log(requires_review, reviewed_at) WHERE requires_review = TRUE AND reviewed_at IS NULL;

-- ============================================================================
-- SEED DATA: Core Role Definitions
-- ============================================================================

-- Insert basic role hierarchy
INSERT INTO role_definitions (role_code, role_name, role_description, role_level, is_elected, default_term_years, can_delegate, is_system_role, permissions) VALUES
  -- Leadership roles
  ('admin', 'Organization Administrator', 'Full system access, manages all aspects of the organization', 100, FALSE, NULL, TRUE, TRUE, 
   '["*"]'::jsonb),
  
  ('president', 'Union President', 'Elected chief executive officer of the union', 90, TRUE, 3, TRUE, TRUE,
   '["view_all_claims", "edit_all_claims", "approve_claim", "view_all_members", "edit_member", "invite_member", 
     "manage_voting", "edit_cba", "view_analytics", "manage_users"]'::jsonb),
  
  ('vice_president', 'Vice President', 'Elected vice president, second in command', 85, TRUE, 3, TRUE, TRUE,
   '["view_all_claims", "edit_all_claims", "approve_claim", "view_all_members", "edit_member", 
     "view_voting", "view_cba", "view_analytics"]'::jsonb),
  
  ('secretary_treasurer', 'Secretary-Treasurer', 'Elected financial officer', 85, TRUE, 3, FALSE, TRUE,
   '["view_all_claims", "view_all_members", "view_financial", "edit_financial", "approve_financial", 
     "view_analytics", "view_advanced_analytics"]'::jsonb),
  
  -- Representative roles
  ('chief_steward', 'Chief Steward', 'Supervises all stewards, handles complex grievances', 70, TRUE, 2, TRUE, TRUE,
   '["view_all_claims", "edit_all_claims", "approve_claim", "view_all_members", "edit_member", 
     "assign_claims", "view_analytics"]'::jsonb),
  
  ('steward', 'Union Steward', 'Department representative, handles member grievances', 50, TRUE, 2, FALSE, TRUE,
   '["view_all_claims", "create_claim", "edit_own_claims", "view_all_members", "edit_member", 
     "assign_claims"]'::jsonb),
  
  ('officer', 'Union Officer', 'Board member with oversight responsibilities', 60, TRUE, 3, FALSE, TRUE,
   '["view_all_claims", "approve_claim", "view_all_members", "view_voting", "view_analytics"]'::jsonb),
  
  -- Committee roles
  ('bargaining_committee', 'Bargaining Committee Member', 'Participates in contract negotiations', 40, TRUE, NULL, FALSE, TRUE,
   '["view_cba", "edit_cba", "view_all_members", "view_analytics"]'::jsonb),
  
  ('health_safety_rep', 'Health & Safety Representative', 'Monitors workplace safety', 30, TRUE, 1, FALSE, TRUE,
   '["view_health_safety_claims", "create_health_safety_claim", "view_members"]'::jsonb),
  
  -- Member role
  ('member', 'Union Member', 'Regular member with self-service access', 10, FALSE, NULL, FALSE, TRUE,
   '["view_own_claims", "create_claim", "edit_own_claims", "view_own_profile", "cast_vote"]'::jsonb)
  
ON CONFLICT (role_code) DO UPDATE SET
  role_name = EXCLUDED.role_name,
  role_description = EXCLUDED.role_description,
  role_level = EXCLUDED.role_level,
  permissions = EXCLUDED.permissions,
  updated_at = NOW();

-- ============================================================================
-- FUNCTIONS: Automatic Term Expiration
-- ============================================================================

-- Function to check and update expired terms
CREATE OR REPLACE FUNCTION check_expired_terms()
RETURNS void AS $$
BEGIN
  UPDATE member_roles
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate vote percentage
CREATE OR REPLACE FUNCTION calculate_vote_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote_count IS NOT NULL AND NEW.total_votes IS NOT NULL AND NEW.total_votes > 0 THEN
    NEW.vote_percentage := ROUND((NEW.vote_count::DECIMAL / NEW.total_votes::DECIMAL) * 100, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_vote_percentage
  BEFORE INSERT OR UPDATE ON member_roles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_vote_percentage();

-- Function to update timestamp on record change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_role_definitions_updated_at
  BEFORE UPDATE ON role_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_member_roles_updated_at
  BEFORE UPDATE ON member_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_permission_exceptions_updated_at
  BEFORE UPDATE ON permission_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS: Convenience queries
-- ============================================================================

-- Active roles with member details
CREATE OR REPLACE VIEW v_active_member_roles AS
SELECT 
  mr.*,
  om.name as member_name,
  om.email as member_email,
  rd.role_name,
  rd.role_level,
  rd.permissions,
  rd.is_elected,
  CASE 
    WHEN mr.end_date IS NULL THEN 'indefinite'
    WHEN mr.end_date < CURRENT_DATE THEN 'expired'
    WHEN mr.end_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
    ELSE 'active'
  END as term_status
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
JOIN role_definitions rd ON mr.role_code = rd.role_code
WHERE mr.status = 'active';

-- Upcoming elections
CREATE OR REPLACE VIEW v_upcoming_elections AS
SELECT 
  mr.*,
  om.name as member_name,
  rd.role_name,
  mr.next_election_date - CURRENT_DATE as days_until_election
FROM member_roles mr
JOIN organization_members om ON mr.member_id = om.id
JOIN role_definitions rd ON mr.role_code = rd.role_code
WHERE mr.next_election_date IS NOT NULL
  AND mr.next_election_date >= CURRENT_DATE
  AND mr.status = 'active'
ORDER BY mr.next_election_date;

-- Audit summary by actor
CREATE OR REPLACE VIEW v_audit_summary_by_actor AS
SELECT 
  actor_id,
  actor_name,
  tenant_id,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE granted = FALSE) as denied_actions,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(*) FILTER (WHERE is_sensitive = TRUE) as sensitive_actions,
  MIN(timestamp) as first_action,
  MAX(timestamp) as last_action
FROM rbac_audit_log
GROUP BY actor_id, actor_name, tenant_id;

-- ============================================================================
-- MIGRATION COMPLETION
-- ============================================================================

COMMENT ON TABLE role_definitions IS 'Defines available roles in the system with their permissions and characteristics';
COMMENT ON TABLE member_roles IS 'Tracks role assignments to members with scope, terms, and temporal data';
COMMENT ON TABLE permission_exceptions IS 'Case-by-case permission grants outside normal role hierarchy';
COMMENT ON TABLE rbac_audit_log IS 'Immutable audit trail for compliance and security monitoring';

-- Migration complete
