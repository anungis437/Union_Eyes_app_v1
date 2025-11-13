-- =========================================================================
-- COURTLENS BILLING SYSTEM - SEED DATA
-- Migration: 003_seed_data.sql
-- Created: 2024
-- Description: Initial seed data for billing system
-- =========================================================================

-- =========================================================================
-- DEFAULT MATTER TYPES (PRACTICE AREAS)
-- =========================================================================

INSERT INTO matter_types (organization_id, name, code, description, default_hourly_rate) VALUES
-- Civil Litigation
(uuid_generate_v4(), 'Civil Litigation', 'CIVIL', 'General civil litigation matters', 450.00),
(uuid_generate_v4(), 'Personal Injury', 'PI', 'Personal injury and tort claims', 400.00),
(uuid_generate_v4(), 'Employment Law', 'EMP', 'Employment and labour disputes', 425.00),
(uuid_generate_v4(), 'Contract Disputes', 'CONTRACT', 'Breach of contract and commercial disputes', 475.00),

-- Corporate Law
(uuid_generate_v4(), 'Corporate Law', 'CORP', 'Corporate governance and transactions', 500.00),
(uuid_generate_v4(), 'Mergers & Acquisitions', 'MA', 'M&A transactions and due diligence', 550.00),
(uuid_generate_v4(), 'Securities Law', 'SEC', 'Securities compliance and transactions', 525.00),
(uuid_generate_v4(), 'Commercial Law', 'COMM', 'General commercial legal matters', 450.00),

-- Real Estate
(uuid_generate_v4(), 'Real Estate', 'RE', 'Real estate transactions and disputes', 375.00),
(uuid_generate_v4(), 'Construction Law', 'CONST', 'Construction contracts and disputes', 425.00),
(uuid_generate_v4(), 'Land Development', 'DEV', 'Land development and zoning', 400.00),

-- Family Law
(uuid_generate_v4(), 'Divorce', 'DIV', 'Divorce and separation proceedings', 350.00),
(uuid_generate_v4(), 'Child Custody', 'CUSTODY', 'Child custody and access matters', 350.00),
(uuid_generate_v4(), 'Family Property', 'FAMPROP', 'Division of family property', 375.00),
(uuid_generate_v4(), 'Adoption', 'ADOPT', 'Adoption proceedings', 325.00),

-- Criminal Law
(uuid_generate_v4(), 'Criminal Defence', 'CRIM', 'Criminal defence matters', 300.00),
(uuid_generate_v4(), 'Regulatory Offences', 'REG', 'Regulatory and quasi-criminal matters', 325.00),
(uuid_generate_v4(), 'Appeals', 'APPEAL', 'Criminal and civil appeals', 400.00),

-- Wills & Estates
(uuid_generate_v4(), 'Wills & Estates', 'WE', 'Estate planning and administration', 325.00),
(uuid_generate_v4(), 'Estate Litigation', 'ESTLIT', 'Estate disputes and litigation', 400.00),
(uuid_generate_v4(), 'Power of Attorney', 'POA', 'Powers of attorney and guardianship', 275.00),

-- Immigration
(uuid_generate_v4(), 'Immigration', 'IMM', 'Immigration and citizenship matters', 300.00),
(uuid_generate_v4(), 'Refugee Law', 'REF', 'Refugee and protection claims', 275.00),

-- Intellectual Property
(uuid_generate_v4(), 'Intellectual Property', 'IP', 'IP registration and disputes', 450.00),
(uuid_generate_v4(), 'Patent Law', 'PAT', 'Patent applications and prosecution', 500.00),
(uuid_generate_v4(), 'Trademark Law', 'TM', 'Trademark registration and disputes', 400.00),

-- Administrative Law
(uuid_generate_v4(), 'Administrative Law', 'ADMIN', 'Administrative law and judicial review', 375.00),
(uuid_generate_v4(), 'Municipal Law', 'MUN', 'Municipal and local government law', 350.00),

-- Tax Law
(uuid_generate_v4(), 'Tax Law', 'TAX', 'Tax planning and disputes', 450.00),
(uuid_generate_v4(), 'Tax Litigation', 'TAXLIT', 'Tax court proceedings', 475.00);

-- =========================================================================
-- COMMON TIME ENTRY TEMPLATES
-- =========================================================================

-- Research Templates
INSERT INTO time_entry_templates (organization_id, name, description, estimated_duration_minutes, is_billable) VALUES
(uuid_generate_v4(), 'Legal Research', 'Legal research and case law analysis', 120, true),
(uuid_generate_v4(), 'Statutory Research', 'Statutory and regulatory research', 90, true),
(uuid_generate_v4(), 'Precedent Research', 'Research for precedent documents', 60, true),
(uuid_generate_v4(), 'Due Diligence Review', 'Document review for due diligence', 180, true);

-- Drafting Templates
INSERT INTO time_entry_templates (organization_id, name, description, estimated_duration_minutes, is_billable) VALUES
(uuid_generate_v4(), 'Contract Drafting', 'Drafting contracts and agreements', 240, true),
(uuid_generate_v4(), 'Letter Writing', 'Drafting correspondence', 30, true),
(uuid_generate_v4(), 'Pleadings Draft', 'Drafting court pleadings', 180, true),
(uuid_generate_v4(), 'Legal Memo', 'Preparing legal memorandum', 150, true);

-- Court & Meetings Templates
INSERT INTO time_entry_templates (organization_id, name, description, estimated_duration_minutes, is_billable) VALUES
(uuid_generate_v4(), 'Court Appearance', 'Attendance at court hearing', 120, true),
(uuid_generate_v4(), 'Client Meeting', 'Meeting with client', 60, true),
(uuid_generate_v4(), 'Opposing Counsel Call', 'Telephone conference with opposing counsel', 30, true),
(uuid_generate_v4(), 'Mediation Attendance', 'Attendance at mediation', 240, true),
(uuid_generate_v4(), 'Deposition', 'Attendance at examination for discovery', 300, true);

-- Administrative Templates
INSERT INTO time_entry_templates (organization_id, name, description, estimated_duration_minutes, is_billable) VALUES
(uuid_generate_v4(), 'File Review', 'Review of client file and documents', 45, true),
(uuid_generate_v4(), 'Document Organization', 'Organizing and filing documents', 30, false),
(uuid_generate_v4(), 'Invoice Preparation', 'Preparing client invoice', 15, false),
(uuid_generate_v4(), 'Travel Time', 'Travel to court or client meeting', 60, true);

-- Transaction Templates
INSERT INTO time_entry_templates (organization_id, name, description, estimated_duration_minutes, is_billable) VALUES
(uuid_generate_v4(), 'Closing Preparation', 'Preparing for real estate closing', 120, true),
(uuid_generate_v4(), 'Title Review', 'Reviewing title documents', 45, true),
(uuid_generate_v4(), 'Corporate Filing', 'Corporate registry filings', 30, true),
(uuid_generate_v4(), 'Registration Process', 'Processing registrations', 60, true);

-- =========================================================================
-- SAMPLE EXPENSE CATEGORIES
-- =========================================================================

-- Note: These would typically be inserted via application logic, but included for reference

-- Common expense categories for Canadian legal practice:
-- - Court Filing Fees
-- - Process Service
-- - Photocopying/Printing
-- - Travel Expenses
-- - Accommodation
-- - Meals (client meetings)
-- - Long Distance Charges
-- - Courier/Delivery
-- - Expert Witness Fees
-- - Court Reporter Fees
-- - Translation Services
-- - Title Searches
-- - Corporate Searches
-- - Land Registry Fees
-- - Sheriff Fees
-- - Bailiff Fees

-- =========================================================================
-- DEFAULT TASK CODES (Activity Codes)
-- =========================================================================

-- These are commonly used activity codes in Canadian legal billing:
-- ADMIN - Administrative tasks
-- RESEARCH - Legal research
-- DRAFT - Document drafting
-- REVIEW - Document review
-- COURT - Court appearances
-- MEET - Client meetings
-- CALL - Telephone calls
-- EMAIL - Email correspondence
-- TRAVEL - Travel time
-- DISC - Discovery/Examinations
-- MEDIAT - Mediation
-- NEGOT - Negotiations
-- FILING - Court/Registry filings
-- LETTER - Correspondence
-- MEMO - Legal memoranda
-- BRIEF - Brief preparation

-- =========================================================================
-- SAMPLE TAX RATES (Canadian Provinces)
-- =========================================================================

-- Note: These rates are examples and should be updated based on current rates
-- HST Provinces (13%): Ontario, New Brunswick, Newfoundland and Labrador, Nova Scotia, Prince Edward Island
-- GST + PST Provinces: All others
-- Quebec: GST (5%) + QST (9.975%)
-- British Columbia: GST (5%) + PST (7%)
-- Saskatchewan: GST (5%) + PST (6%)
-- Manitoba: GST (5%) + PST (7%)
-- Alberta: GST (5%) only
-- Territories: GST (5%) only

-- =========================================================================
-- SYSTEM SETTINGS
-- =========================================================================

-- These would be stored in organization settings JSONB field:
/*
{
  "billing": {
    "default_payment_terms": 30,
    "late_fee_percentage": 1.5,
    "invoice_prefix": "INV-",
    "matter_prefix": "MTR-",
    "client_prefix": "CLT-",
    "auto_number_padding": 4
  },
  "tax": {
    "default_rate": 0.13,
    "registration_number": "HST123456789RT0001"
  },
  "trust": {
    "iolta_account_name": "Trust Account",
    "reconciliation_frequency": "monthly",
    "auto_reconcile": false
  },
  "time_tracking": {
    "minimum_increment": 6,
    "round_up": true,
    "auto_pause_after": 30,
    "require_task_codes": false
  },
  "invoicing": {
    "show_time_details": true,
    "group_by_matter": true,
    "include_expenses": true,
    "auto_send": false
  }
}
*/