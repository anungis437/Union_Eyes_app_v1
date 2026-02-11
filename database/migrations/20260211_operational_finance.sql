-- OPERATIONAL FINANCE SCHEMA MIGRATION
-- Database: PostgreSQL
-- Purpose: Expand Financial module with operational finance (budgets, expenses, vendors, AP)
-- Date: 2026-02-11

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE budget_status AS ENUM ('draft', 'approved', 'active', 'closed', 'revised');
CREATE TYPE budget_period_type AS ENUM ('annual', 'quarterly', 'monthly', 'project');
CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated');
CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'suspended', 'archived');
CREATE TYPE payment_terms AS ENUM ('net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'due_on_receipt', 'cod');

-- =============================================================================
-- TABLE: vendors
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vendor_number VARCHAR(50) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    vendor_type VARCHAR(100),
    tax_id VARCHAR(50),
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    fax VARCHAR(50),
    address JSONB,
    billing_address JSONB,
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    payment_terms payment_terms DEFAULT 'net_30',
    default_account_code VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'CAD',
    credit_limit NUMERIC(15, 2),
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    ytd_spending NUMERIC(15, 2) DEFAULT 0.00,
    status vendor_status DEFAULT 'active' NOT NULL,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    bank_account_info JSONB,
    tax_info JSONB,
    insurance_info JSONB,
    contract_info JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    last_review_date DATE,
    next_review_date DATE,
    
    CONSTRAINT unique_vendor_number UNIQUE (organization_id, vendor_number),
    CONSTRAINT unique_vendor_name UNIQUE (organization_id, vendor_name)
);

CREATE INDEX idx_vendors_org ON vendors(organization_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_type ON vendors(vendor_type);
CREATE INDEX idx_vendors_name ON vendors(vendor_name);

-- =============================================================================
-- TABLE: budgets
-- =============================================================================

CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    budget_name VARCHAR(255) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    period_type budget_period_type DEFAULT 'annual' NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_budget NUMERIC(15, 2) NOT NULL,
    total_allocated NUMERIC(15, 2) DEFAULT 0.00,
    total_spent NUMERIC(15, 2) DEFAULT 0.00,
    total_committed NUMERIC(15, 2) DEFAULT 0.00,
    status budget_status DEFAULT 'draft' NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    CONSTRAINT unique_budget_name_year UNIQUE (organization_id, budget_name, fiscal_year)
);

CREATE INDEX idx_budgets_org ON budgets(organization_id);
CREATE INDEX idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_period ON budgets(start_date, end_date);

-- =============================================================================
-- TABLE: budget_line_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    department_id UUID,
    category_id UUID,
    allocated_amount NUMERIC(15, 2) NOT NULL,
    spent_amount NUMERIC(15, 2) DEFAULT 0.00,
    committed_amount NUMERIC(15, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budget_lines ON budget_line_items(budget_id);
CREATE INDEX idx_budget_lines_account ON budget_line_items(account_code);
CREATE INDEX idx_budget_lines_dept ON budget_line_items(department_id);

-- =============================================================================
-- TABLE: expense_requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS expense_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_number VARCHAR(50) NOT NULL,
    requester_id UUID NOT NULL,
    budget_id UUID REFERENCES budgets(id),
    budget_line_item_id UUID REFERENCES budget_line_items(id),
    expense_date DATE NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    vendor_id UUID REFERENCES vendors(id),
    vendor_name VARCHAR(255),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(100),
    payment_method VARCHAR(50),
    reimbursement_required BOOLEAN DEFAULT TRUE,
    receipt_url TEXT,
    attachments JSONB DEFAULT '[]',
    status expense_status DEFAULT 'draft' NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(255),
    notes TEXT,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_expense_request_number UNIQUE (organization_id, request_number)
);

CREATE INDEX idx_expenses_org ON expense_requests(organization_id);
CREATE INDEX idx_expenses_requester ON expense_requests(requester_id);
CREATE INDEX idx_expenses_status ON expense_requests(status);
CREATE INDEX idx_expenses_date ON expense_requests(expense_date);
CREATE INDEX idx_expenses_budget ON expense_requests(budget_id);
CREATE INDEX idx_expenses_vendor ON expense_requests(vendor_id);
CREATE INDEX idx_expenses_account ON expense_requests(account_code);

-- =============================================================================
-- TABLE: expense_approvals
-- =============================================================================

CREATE TABLE IF NOT EXISTS expense_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_request_id UUID NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL,
    approver_level INTEGER NOT NULL,
    status approval_status DEFAULT 'pending' NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    delegated_to UUID,
    is_required BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approvals_expense ON expense_approvals(expense_request_id);
CREATE INDEX idx_approvals_approver ON expense_approvals(approver_id);
CREATE INDEX idx_approvals_status ON expense_approvals(status);

-- =============================================================================
-- TABLE: vendor_invoices
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendor_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    budget_id UUID REFERENCES budgets(id),
    budget_line_item_id UUID REFERENCES budget_line_items(id),
    account_code VARCHAR(50) NOT NULL,
    description TEXT,
    subtotal NUMERIC(15, 2) NOT NULL,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(255),
    invoice_url TEXT,
    attachments JSONB DEFAULT '[]',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    CONSTRAINT unique_vendor_invoice_number UNIQUE (organization_id, vendor_id, invoice_number)
);

CREATE INDEX idx_vendor_invoices_org ON vendor_invoices(organization_id);
CREATE INDEX idx_vendor_invoices_vendor ON vendor_invoices(vendor_id);
CREATE INDEX idx_vendor_invoices_status ON vendor_invoices(status);
CREATE INDEX idx_vendor_invoices_due_date ON vendor_invoices(due_date);
CREATE INDEX idx_vendor_invoices_budget ON vendor_invoices(budget_id);
CREATE INDEX idx_vendor_invoices_account ON vendor_invoices(account_code);

-- =============================================================================
-- TABLE: accounts_payable
-- =============================================================================

CREATE TABLE IF NOT EXISTS accounts_payable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    invoice_id UUID REFERENCES vendor_invoices(id),
    expense_request_id UUID REFERENCES expense_requests(id),
    reference_type VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) DEFAULT 0.00,
    balance_amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CAD',
    status VARCHAR(50) DEFAULT 'open' NOT NULL,
    days_overdue INTEGER DEFAULT 0,
    aging_bucket VARCHAR(50),
    last_payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ap_org ON accounts_payable(organization_id);
CREATE INDEX idx_ap_vendor ON accounts_payable(vendor_id);
CREATE INDEX idx_ap_status ON accounts_payable(status);
CREATE INDEX idx_ap_due_date ON accounts_payable(due_date);
CREATE INDEX idx_ap_aging ON accounts_payable(aging_bucket);
CREATE INDEX idx_ap_overdue ON accounts_payable(days_overdue) WHERE days_overdue > 0;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE vendors IS 'Vendor/supplier directory and management';
COMMENT ON TABLE budgets IS 'Organizational budget planning and tracking';
COMMENT ON TABLE budget_line_items IS 'Detailed budget allocations by account/department';
COMMENT ON TABLE expense_requests IS 'Employee expense submission and approval workflow';
COMMENT ON TABLE expense_approvals IS 'Approval chain for expense requests';
COMMENT ON TABLE vendor_invoices IS 'Operational invoices from vendors';
COMMENT ON TABLE accounts_payable IS 'AP tracking and aging analysis';
