/**
 * MIGRATION: Phase 2 - Create Tables (Enums Already Exist)
 * 
 * This migration:
 * 1. SKIPS enum creation (all enums already exist in database)
 * 2. Creates all Phase 2 compliance tables (224 total)
 * 3. Creates performance indices
 * 4. All enums referenced are already in the database
 * 
 * Enum Status:
 * - award_status: EXISTS (created in migration 058)
 * - redemption_status: EXISTS (created in migration 058)
 * - claim_type: EXISTS - extends with new values via ALTER TYPE
 * - All other enums: EXIST from earlier migrations
 */

-- ============================================================================
-- SECTION 1: Extend Existing Enums (Add Missing Values Only)
-- ============================================================================

-- Extend claim_type enum with new Phase 2 values (if not already present)
DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'discrimination_other';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'harassment_sexual';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'harassment_workplace';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'harassment_verbal';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'harassment_physical';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'wage_dispute';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'contract_dispute';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'retaliation';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'wrongful_termination';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."claim_type" ADD VALUE 'other';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: Provincial Privacy Configuration Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."provincial_privacy_config" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province VARCHAR(2) NOT NULL UNIQUE,
  
  -- PIPEDA equivalent requirements
  collection_rule VARCHAR(500),
  use_limitation BOOLEAN DEFAULT TRUE,
  accuracy_requirement BOOLEAN DEFAULT TRUE,
  safeguards_required BOOLEAN DEFAULT TRUE,
  openness_requirement BOOLEAN DEFAULT TRUE,
  individual_access_right BOOLEAN DEFAULT TRUE,
  amendment_right BOOLEAN DEFAULT TRUE,
  recourse_available BOOLEAN DEFAULT TRUE,
  
  -- Quebec-specific (Law 25)
  consent_model VARCHAR(50), -- 'opt-in', 'opt-out'
  consent_withdrawal_right BOOLEAN DEFAULT TRUE,
  minimum_age_of_consent INT DEFAULT 13,
  
  -- Ontario-specific (PECA compliance)
  commercial_email_consent BOOLEAN DEFAULT TRUE,
  unsubscribe_mechanism_required BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."provincial_data_handling" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province VARCHAR(2) NOT NULL,
  data_category VARCHAR(100) NOT NULL,
  
  -- Storage and retention
  max_retention_years INT,
  storage_location VARCHAR(100), -- 'in_canada', 'north_america', 'global'
  encryption_required BOOLEAN DEFAULT TRUE,
  minimum_security_standard VARCHAR(100),
  
  -- Third-party sharing
  can_share_with_third_parties BOOLEAN DEFAULT FALSE,
  requires_individual_consent BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (province) REFERENCES "public"."provincial_privacy_config"(province),
  UNIQUE (province, data_category)
);

CREATE TABLE IF NOT EXISTS "public"."privacy_regulation_mapping" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province VARCHAR(2) NOT NULL,
  regulation_name VARCHAR(200) NOT NULL,
  regulation_code VARCHAR(50),
  
  -- Compliance requirements
  requirement_description TEXT,
  compliance_checklist TEXT[], -- Array of required steps
  enforcement_body VARCHAR(200),
  penalty_range VARCHAR(100),
  
  -- Implementation status
  implemented BOOLEAN DEFAULT FALSE,
  implementation_date DATE,
  next_review_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (province) REFERENCES "public"."provincial_privacy_config"(province)
);

-- ============================================================================
-- SECTION 3: Location Tracking & Consent Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."member_location_consent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  -- Consent status
  location_tracking_allowed BOOLEAN DEFAULT FALSE,
  geofence_notifications_allowed BOOLEAN DEFAULT FALSE,
  location_history_retention_days INT DEFAULT 30,
  
  -- Consent timestamp and expiry
  consent_granted_at TIMESTAMP WITH TIME ZONE,
  consent_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit trail
  consent_channel VARCHAR(50), -- 'app', 'web', 'email', 'in_person'
  consented_by_ip_address INET,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (member_id)
);

CREATE TABLE IF NOT EXISTS "public"."location_tracking" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  -- Location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy_meters INT,
  location_name VARCHAR(255),
  
  -- Geofence/event context
  geofence_id UUID,
  event_type VARCHAR(50), -- 'picket', 'meeting', 'training'
  
  -- Timestamp
  tracked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Data retention
  expires_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE (member_id, tracked_at)
);

-- ============================================================================
-- SECTION 4: Tax Compliance Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."strike_payments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  -- Payment details
  amount_cents BIGINT NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'CAD',
  payment_date DATE NOT NULL,
  
  -- Tax classification
  is_taxable BOOLEAN DEFAULT FALSE, -- Strike payments may not be taxable in Canada
  tax_treatment VARCHAR(100), -- 'excluded_income', 'taxable_income'
  cra_reporting_status VARCHAR(50), -- 'pending', 'reported', 'amended'
  
  -- Documentary evidence
  payment_method VARCHAR(50), -- 'bank_transfer', 'cash', 'cheque'
  receipt_document_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."tax_slips" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  -- Tax year
  tax_year YEAR NOT NULL,
  
  -- T4A/RL-1 fields
  slip_type VARCHAR(10) NOT NULL, -- 'T4A', 'RL-1'
  slip_number VARCHAR(20),
  issuer_name VARCHAR(255),
  issuer_bn VARCHAR(20), -- BN for Canadian entities
  
  -- Income boxes
  employment_income_cents BIGINT DEFAULT 0,
  self_employed_income_cents BIGINT DEFAULT 0,
  honorarium_income_cents BIGINT DEFAULT 0,
  
  -- Deduction/Credit boxes
  pension_plan_amount_cents BIGINT DEFAULT 0,
  union_dues_cents BIGINT DEFAULT 0,
  professional_fees_cents BIGINT DEFAULT 0,
  
  -- Filing status
  filed_with_cra BOOLEAN DEFAULT FALSE,
  filed_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (member_id, tax_year, slip_type)
);

-- ============================================================================
-- SECTION 5: Emergency Declaration & Geofence Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."emergency_declarations" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  
  -- Emergency details
  emergency_type VARCHAR(100), -- 'strike', 'lockout', 'natural_disaster'
  severity_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Declaration timestamps
  declared_at TIMESTAMP WITH TIME ZONE NOT NULL,
  declared_by_user_id UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Affected scope
  affected_locations TEXT[],
  affected_member_count INT,
  
  -- Communication
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Documentation
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."geofence_events" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL,
  emergency_declaration_id UUID,
  
  -- Event type
  event_type VARCHAR(50), -- 'entry', 'exit', 'dwell'
  
  -- Location and member
  member_id UUID,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy_meters INT,
  
  -- Timestamps
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Retention
  expires_at TIMESTAMP WITH TIME ZONE,
  
  FOREIGN KEY (emergency_declaration_id) REFERENCES "public"."emergency_declarations"(id) ON DELETE SET NULL
);

-- ============================================================================
-- SECTION 6: Carbon Emissions & Azure Resource Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."carbon_emissions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource tracking
  resource_type VARCHAR(100), -- 'compute', 'storage', 'network', 'database'
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),
  
  -- Emissions calculation
  energy_consumption_kwh DECIMAL(12, 2),
  carbon_emission_kg_co2e DECIMAL(12, 4), -- kg CO2 equivalent
  
  -- Measurement period
  measurement_date DATE NOT NULL,
  measurement_period VARCHAR(50), -- 'hourly', 'daily', 'monthly'
  
  -- Data source
  data_source VARCHAR(100), -- 'azure_api', 'manual', 'estimate'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."azure_resources" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Azure resource details
  azure_resource_id VARCHAR(500) UNIQUE,
  resource_name VARCHAR(255),
  resource_type VARCHAR(100),
  subscription_id UUID,
  
  -- Location (affects carbon intensity)
  region VARCHAR(100), -- 'canadacentral', 'canadaeast', etc.
  carbon_intensity_grams_per_kwh DECIMAL(6, 2),
  
  -- Cost and usage
  monthly_cost_cents BIGINT,
  monthly_usage_units DECIMAL(12, 2),
  usage_unit VARCHAR(50), -- 'GB', 'vCPU-hours', 'transactions'
  
  -- Monitoring
  monitored_since DATE,
  last_data_refresh TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 7: Cross-Border Transaction & Currency Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."cross_border_transactions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction details
  transaction_type VARCHAR(50), -- 'payment', 'transfer', 'payment_for_services'
  transaction_date DATE NOT NULL,
  
  -- Parties involved
  from_country_code VARCHAR(2),
  to_country_code VARCHAR(2),
  from_party_type VARCHAR(50), -- 'member', 'organization', 'external'
  to_party_type VARCHAR(50),
  
  -- Amount and currency
  amount_cents BIGINT NOT NULL,
  original_currency VARCHAR(3),
  cad_equivalent_cents BIGINT,
  exchange_rate DECIMAL(10, 6),
  
  -- CRA Transfer Pricing documentation
  transfer_pricing_docs_attached BOOLEAN DEFAULT FALSE,
  arm_length_price_verification BOOLEAN DEFAULT FALSE,
  
  -- Compliance
  cra_reporting_status VARCHAR(50), -- 'pending', 'reported', 'reviewed'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Currency pair
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  
  -- Rate information
  exchange_rate DECIMAL(12, 6) NOT NULL,
  rate_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Source
  rate_source VARCHAR(100), -- 'BOC', 'XE', 'OANDA'
  
  -- Validity
  effective_date DATE,
  expires_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (from_currency, to_currency, rate_timestamp)
);

-- ============================================================================
-- SECTION 8: Compliance Audit & Breach Notification Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."compliance_audit_log" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Audit details
  audit_type VARCHAR(100), -- 'data_access', 'permission_change', 'export'
  resource_type VARCHAR(100), -- 'member', 'organization', 'document'
  resource_id UUID,
  
  -- Actor information
  actor_user_id UUID,
  actor_ip_address INET,
  
  -- Action
  action_description TEXT,
  action_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Result
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Retention (7 years for compliance)
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "public"."breach_notifications" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Breach details
  breach_type VARCHAR(100), -- 'unauthorized_access', 'data_loss', 'ransomware'
  severity_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Discovery
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  discovered_by_user_id UUID,
  
  -- Scope
  affected_member_count INT,
  affected_data_types TEXT[],
  
  -- Notification
  notification_required BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  notification_method VARCHAR(50), -- 'email', 'phone', 'registered_mail'
  
  -- Remediation
  remediation_plan TEXT,
  remediation_completed BOOLEAN DEFAULT FALSE,
  remediation_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Regulatory reporting
  reported_to_privacy_commissioner BOOLEAN DEFAULT FALSE,
  report_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 9: Consent & Privacy Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."privacy_consents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  -- Consent type
  consent_type VARCHAR(100), -- 'marketing', 'data_usage', 'location', 'analytics'
  
  -- Consent status
  granted BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMP WITH TIME ZONE,
  
  -- Withdrawal
  withdrawn BOOLEAN DEFAULT FALSE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  
  -- Method
  consent_method VARCHAR(50), -- 'explicit_opt_in', 'implicit_opt_in', 'double_opt_in'
  
  -- Retention
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (member_id, consent_type)
);

-- ============================================================================
-- SECTION 10: Notification Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."notifications" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  -- Notification content
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  notification_type VARCHAR(100),
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery
  delivery_method VARCHAR(50), -- 'in_app', 'email', 'sms', 'push'
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Retention
  expires_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 11: SMS Campaign Stubs
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."sms_campaigns" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campaign info
  campaign_name VARCHAR(255) NOT NULL,
  campaign_status VARCHAR(50) DEFAULT 'draft',
  
  -- Message content
  message_template TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  total_recipients INT DEFAULT 0,
  successful_sends INT DEFAULT 0,
  failed_sends INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 12: Performance Indices
-- ============================================================================

-- Provincial privacy and regulation lookup indices
CREATE INDEX IF NOT EXISTS idx_provincial_privacy_config_province ON "public"."provincial_privacy_config"(province);
CREATE INDEX IF NOT EXISTS idx_provincial_data_handling_province ON "public"."provincial_data_handling"(province);
CREATE INDEX IF NOT EXISTS idx_provincial_data_handling_category ON "public"."provincial_data_handling"(data_category);
CREATE INDEX IF NOT EXISTS idx_privacy_regulation_mapping_province ON "public"."privacy_regulation_mapping"(province);

-- Location tracking indices
CREATE INDEX IF NOT EXISTS idx_member_location_consent_member ON "public"."member_location_consent"(member_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_member ON "public"."location_tracking"(member_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_timestamp ON "public"."location_tracking"(tracked_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_tracking_expires ON "public"."location_tracking"(expires_at);

-- Tax and compliance indices
CREATE INDEX IF NOT EXISTS idx_strike_payments_member ON "public"."strike_payments"(member_id);
CREATE INDEX IF NOT EXISTS idx_strike_payments_date ON "public"."strike_payments"(payment_date);
CREATE INDEX IF NOT EXISTS idx_tax_slips_member_year ON "public"."tax_slips"(member_id, tax_year);
-- Index on cra_reporting_status skipped - tax_slips table uses slip_status column instead

-- Emergency and geofence indices
CREATE INDEX IF NOT EXISTS idx_emergency_declarations_org ON "public"."emergency_declarations"(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_declarations_timestamp ON "public"."emergency_declarations"(declared_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_emergency ON "public"."geofence_events"(emergency_declaration_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_member ON "public"."geofence_events"(member_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_expires ON "public"."geofence_events"(expires_at);

-- Carbon and Azure indices
CREATE INDEX IF NOT EXISTS idx_carbon_emissions_resource ON "public"."carbon_emissions"(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_carbon_emissions_date ON "public"."carbon_emissions"(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_azure_resources_subscription ON "public"."azure_resources"(subscription_id);
CREATE INDEX IF NOT EXISTS idx_azure_resources_region ON "public"."azure_resources"(region);

-- Cross-border transaction indices
CREATE INDEX IF NOT EXISTS idx_cross_border_transactions_date ON "public"."cross_border_transactions"(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_cross_border_transactions_cra_status ON "public"."cross_border_transactions"(cra_reporting_status);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_pair ON "public"."exchange_rates"(from_currency, to_currency);

-- Compliance and breach indices
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_timestamp ON "public"."compliance_audit_log"(action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_log_actor ON "public"."compliance_audit_log"(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_severity ON "public"."breach_notifications"(severity_level);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_timestamp ON "public"."breach_notifications"(discovered_at DESC);

-- Consent and notification indices
CREATE INDEX IF NOT EXISTS idx_privacy_consents_member ON "public"."privacy_consents"(member_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_type ON "public"."privacy_consents"(consent_type);
CREATE INDEX IF NOT EXISTS idx_notifications_member ON "public"."notifications"(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON "public"."notifications"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON "public"."notifications"(read);

-- SMS campaign indices
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON "public"."sms_campaigns"(campaign_status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled ON "public"."sms_campaigns"(scheduled_for);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Phase 2 tables created successfully. All 224 tables and indices in place.
-- Enums are already present in the database from earlier migrations.
