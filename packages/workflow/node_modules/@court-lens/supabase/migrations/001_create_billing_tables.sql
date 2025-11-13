-- =========================================================================
-- COURTLENS BILLING SYSTEM DATABASE SCHEMA
-- Migration: 001_create_billing_tables.sql
-- Created: 2024
-- Description: Comprehensive billing, time tracking, and trust accounting tables
-- =========================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- CORE ENTITIES
-- =========================================================================

-- Organizations (Multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB, -- Structured address data
    website VARCHAR(255),
    logo_url VARCHAR(500),
    settings JSONB DEFAULT '{}', -- Organization-specific settings
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    is_active BOOLEAN DEFAULT true
);

-- Users (Lawyers, Staff, Admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, lawyer, paralegal, clerk, user
    title VARCHAR(100),
    phone VARCHAR(50),
    hourly_rate DECIMAL(10,2),
    overhead_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    bar_number VARCHAR(100),
    jurisdiction VARCHAR(100),
    avatar_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'individual', -- individual, corporation, government
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    fax VARCHAR(50),
    address JSONB, -- Structured address data
    billing_address JSONB, -- Separate billing address if different
    tax_number VARCHAR(100), -- HST/GST number for corporate clients
    preferred_language VARCHAR(10) DEFAULT 'en', -- en, fr
    payment_terms INTEGER DEFAULT 30, -- Days
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    hourly_rate_override DECIMAL(10,2), -- Client-specific override rate
    notes TEXT,
    tags TEXT[], -- Array of tags for categorization
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Matter Types (Practice Areas)
CREATE TABLE matter_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    default_hourly_rate DECIMAL(10,2),
    time_entry_templates JSONB DEFAULT '[]', -- Common time entry descriptions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Matters (Cases/Files)
CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    matter_type_id UUID REFERENCES matter_types(id),
    matter_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    responsible_lawyer_id UUID NOT NULL REFERENCES users(id),
    originating_lawyer_id UUID REFERENCES users(id), -- For referral tracking
    status VARCHAR(20) DEFAULT 'active', -- active, closed, on_hold, archived
    opened_date DATE NOT NULL DEFAULT CURRENT_DATE,
    closed_date DATE,
    statute_date DATE, -- Limitation period
    next_review_date DATE,
    hourly_rate DECIMAL(10,2), -- Matter-specific rate override
    flat_fee DECIMAL(12,2), -- For flat fee matters
    contingency_rate DECIMAL(5,2), -- Percentage for contingency matters
    budget_amount DECIMAL(12,2), -- Matter budget
    budget_warning_threshold DECIMAL(5,2) DEFAULT 80.00, -- Percentage
    retainer_amount DECIMAL(12,2) DEFAULT 0.00,
    trust_balance DECIMAL(12,2) DEFAULT 0.00,
    billing_method VARCHAR(20) DEFAULT 'hourly', -- hourly, flat_fee, contingency, pro_bono
    billing_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, bi_weekly, monthly, quarterly
    tags TEXT[],
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =========================================================================
-- TIME TRACKING
-- =========================================================================

-- Time Entries
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    matter_id UUID NOT NULL REFERENCES matters(id),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL, -- Total duration in minutes
    description TEXT NOT NULL,
    task_code VARCHAR(50), -- Activity code (e.g., RESEARCH, DRAFTING, COURT)
    hourly_rate DECIMAL(10,2) NOT NULL,
    billable_amount DECIMAL(10,2) NOT NULL,
    is_billable BOOLEAN DEFAULT true,
    is_billed BOOLEAN DEFAULT false,
    invoice_id UUID, -- References invoices table (will be created later)
    timer_id UUID, -- For linking to active timers
    source VARCHAR(20) DEFAULT 'manual', -- manual, timer, import, mobile
    location VARCHAR(255), -- For mobile tracking
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Active Timers
CREATE TABLE active_timers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    matter_id UUID NOT NULL REFERENCES matters(id),
    description TEXT NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pause_duration_minutes INTEGER DEFAULT 0, -- Total paused time
    is_paused BOOLEAN DEFAULT false,
    last_pause_time TIMESTAMPTZ,
    task_code VARCHAR(50),
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entry Templates
CREATE TABLE time_entry_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- NULL for organization-wide templates
    matter_type_id UUID REFERENCES matter_types(id), -- Templates specific to matter types
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    task_code VARCHAR(50),
    estimated_duration_minutes INTEGER,
    default_hourly_rate DECIMAL(10,2),
    is_billable BOOLEAN DEFAULT true,
    tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =========================================================================
-- BILLING & INVOICING
-- =========================================================================

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    matter_id UUID REFERENCES matters(id), -- Can be NULL for client-level invoices
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled, void
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    payment_terms INTEGER DEFAULT 30,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,4) DEFAULT 0.00, -- HST/GST rate (e.g., 0.13 for 13%)
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    retainer_applied DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    balance_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'CAD',
    notes TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES users(id)
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id), -- For time-based line items
    line_type VARCHAR(20) DEFAULT 'time', -- time, expense, flat_fee, adjustment
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1.000, -- Hours for time entries
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    is_taxable BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    invoice_id UUID REFERENCES invoices(id), -- Can be NULL for prepayments
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL, -- credit_card, bank_transfer, check, cash, online
    payment_processor VARCHAR(50), -- stripe, paypal, moneris, manual
    processor_transaction_id VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    reference_number VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed, refunded
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =========================================================================
-- TRUST ACCOUNTING (IOLTA Compliance)
-- =========================================================================

-- Trust Accounts
CREATE TABLE trust_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) DEFAULT 'trust', -- trust, operating, savings
    currency VARCHAR(3) DEFAULT 'CAD',
    opening_balance DECIMAL(15,2) DEFAULT 0.00,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Transactions (IOLTA Compliant)
CREATE TABLE trust_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trust_account_id UUID NOT NULL REFERENCES trust_accounts(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    matter_id UUID NOT NULL REFERENCES matters(id),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) NOT NULL, -- deposit, withdrawal, transfer, adjustment
    amount DECIMAL(12,2) NOT NULL, -- Positive for deposits, negative for withdrawals
    balance_after DECIMAL(12,2) NOT NULL, -- Client balance after transaction
    description TEXT NOT NULL,
    reference_number VARCHAR(255), -- Check number, wire reference, etc.
    source_document VARCHAR(255), -- Document reference
    invoice_id UUID REFERENCES invoices(id), -- For invoice payments from trust
    payment_id UUID REFERENCES payments(id), -- Link to payment record
    transfer_to_trust_account_id UUID REFERENCES trust_accounts(id), -- For transfers
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    notes TEXT
);

-- Trust Ledger (Client-specific trust balances)
CREATE TABLE trust_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    matter_id UUID NOT NULL REFERENCES matters(id),
    trust_account_id UUID NOT NULL REFERENCES trust_accounts(id),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    last_transaction_date DATE,
    last_transaction_id UUID REFERENCES trust_transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, matter_id, trust_account_id)
);

-- =========================================================================
-- EXPENSES & DISBURSEMENTS
-- =========================================================================

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    client_id UUID REFERENCES clients(id),
    matter_id UUID REFERENCES matters(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL, -- travel, meals, filing_fees, photocopying, etc.
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'CAD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    is_billable BOOLEAN DEFAULT true,
    is_billed BOOLEAN DEFAULT false,
    markup_percentage DECIMAL(5,2) DEFAULT 0.00,
    billable_amount DECIMAL(10,2),
    receipt_url VARCHAR(500),
    vendor_name VARCHAR(255),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, billed
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    invoice_id UUID REFERENCES invoices(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- AUDIT TRAIL & COMPLIANCE
-- =========================================================================

-- Audit Log (For IOLTA compliance and general auditing)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    session_id UUID
);

-- =========================================================================
-- FINANCIAL REPORTING VIEWS
-- =========================================================================

-- Aging Report Helper View
CREATE VIEW client_aging AS
SELECT 
    i.client_id,
    c.first_name,
    c.last_name,
    c.company_name,
    SUM(CASE WHEN i.balance_due > 0 AND CURRENT_DATE - i.due_date <= 30 THEN i.balance_due ELSE 0 END) as current_balance,
    SUM(CASE WHEN i.balance_due > 0 AND CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.balance_due ELSE 0 END) as overdue_30,
    SUM(CASE WHEN i.balance_due > 0 AND CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.balance_due ELSE 0 END) as overdue_60,
    SUM(CASE WHEN i.balance_due > 0 AND CURRENT_DATE - i.due_date > 90 THEN i.balance_due ELSE 0 END) as overdue_90,
    SUM(i.balance_due) as total_outstanding
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.status NOT IN ('paid', 'cancelled', 'void')
GROUP BY i.client_id, c.first_name, c.last_name, c.company_name;

-- Matter Financial Summary View
CREATE VIEW matter_financials AS
SELECT 
    m.id as matter_id,
    m.matter_number,
    m.title,
    c.first_name || ' ' || c.last_name as client_name,
    COALESCE(SUM(te.billable_amount), 0) as total_time_billed,
    COALESCE(SUM(e.billable_amount), 0) as total_expenses_billed,
    COALESCE(SUM(i.total_amount), 0) as total_invoiced,
    COALESCE(SUM(p.amount), 0) as total_collected,
    m.budget_amount,
    COALESCE(SUM(te.billable_amount) + SUM(e.billable_amount), 0) - COALESCE(m.budget_amount, 0) as budget_variance,
    m.trust_balance
FROM matters m
JOIN clients c ON m.client_id = c.id
LEFT JOIN time_entries te ON m.id = te.matter_id AND te.is_billable = true
LEFT JOIN expenses e ON m.id = e.matter_id AND e.is_billable = true
LEFT JOIN invoices i ON m.id = i.matter_id AND i.status != 'void'
LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'completed'
GROUP BY m.id, m.matter_number, m.title, c.first_name, c.last_name, m.budget_amount, m.trust_balance;

-- =========================================================================
-- INDEXES FOR PERFORMANCE
-- =========================================================================

-- Time tracking indexes
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, entry_date DESC);
CREATE INDEX idx_time_entries_matter_date ON time_entries(matter_id, entry_date DESC);
CREATE INDEX idx_time_entries_client_date ON time_entries(client_id, entry_date DESC);
CREATE INDEX idx_time_entries_billable ON time_entries(is_billable, is_billed);
CREATE INDEX idx_active_timers_user ON active_timers(user_id);

-- Billing indexes
CREATE INDEX idx_invoices_client_date ON invoices(client_id, issue_date DESC);
CREATE INDEX idx_invoices_status_due ON invoices(status, due_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_payments_client_date ON payments(client_id, payment_date DESC);

-- Trust accounting indexes
CREATE INDEX idx_trust_transactions_client_date ON trust_transactions(client_id, transaction_date DESC);
CREATE INDEX idx_trust_transactions_matter_date ON trust_transactions(matter_id, transaction_date DESC);
CREATE INDEX idx_trust_ledger_client_matter ON trust_ledger(client_id, matter_id);
CREATE INDEX idx_trust_transactions_reconciled ON trust_transactions(is_reconciled, transaction_date);

-- General indexes
CREATE INDEX idx_matters_responsible_lawyer ON matters(responsible_lawyer_id, status);
CREATE INDEX idx_matters_client_status ON matters(client_id, status);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id, timestamp DESC);

-- =========================================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER matters_updated_at BEFORE UPDATE ON matters FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trust_accounts_updated_at BEFORE UPDATE ON trust_accounts FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trust_ledger_updated_at BEFORE UPDATE ON trust_ledger FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trust ledger balance update function
CREATE OR REPLACE FUNCTION update_trust_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update trust ledger balance when trust transaction is inserted
    INSERT INTO trust_ledger (
        organization_id, client_id, matter_id, trust_account_id, 
        balance, last_transaction_date, last_transaction_id
    )
    VALUES (
        NEW.organization_id, NEW.client_id, NEW.matter_id, NEW.trust_account_id,
        NEW.balance_after, NEW.transaction_date, NEW.id
    )
    ON CONFLICT (client_id, matter_id, trust_account_id)
    DO UPDATE SET
        balance = NEW.balance_after,
        last_transaction_date = NEW.transaction_date,
        last_transaction_id = NEW.id,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trust_transactions_update_ledger 
    AFTER INSERT ON trust_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_trust_ledger();

-- Invoice balance calculation function
CREATE OR REPLACE FUNCTION calculate_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance_due = NEW.total_amount - NEW.paid_amount - NEW.retainer_applied;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_calculate_balance 
    BEFORE INSERT OR UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_balance();

-- Matter trust balance update function
CREATE OR REPLACE FUNCTION update_matter_trust_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE matters 
    SET trust_balance = (
        SELECT COALESCE(SUM(balance), 0)
        FROM trust_ledger
        WHERE matter_id = NEW.matter_id
    )
    WHERE id = NEW.matter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trust_ledger_update_matter_balance 
    AFTER INSERT OR UPDATE ON trust_ledger 
    FOR EACH ROW EXECUTE FUNCTION update_matter_trust_balance();