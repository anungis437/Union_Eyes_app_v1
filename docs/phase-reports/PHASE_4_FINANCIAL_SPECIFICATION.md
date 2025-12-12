# Phase 4: Financial & Dues Management Module
**Technical Specification v1.0**

## Executive Summary

**Objective:** Implement comprehensive dues calculation, payment processing, and financial governance system to enable full union operations.

**Priority:** CRITICAL - Required for production deployment  
**Timeline:** 8-10 weeks  
**Dependencies:** Multi-tenant architecture, RLS policies, workflow engine  

---

## Database Schema

### 1. Dues Rules Table
```sql
CREATE TABLE dues_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Rule identification
  rule_name VARCHAR(255) NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Member classification
  member_classification VARCHAR(100), -- 'full-time', 'part-time', 'casual', 'apprentice'
  job_category VARCHAR(100),
  department VARCHAR(100),
  local_chapter VARCHAR(100),
  
  -- Calculation method
  calculation_type VARCHAR(50) NOT NULL CHECK (
    calculation_type IN ('percentage', 'flat_rate', 'hourly', 'tiered', 'formula')
  ),
  
  -- Rate configuration
  percentage_rate DECIMAL(5,2), -- e.g., 1.5% = 1.50
  flat_amount DECIMAL(10,2),
  hourly_rate DECIMAL(8,2),
  
  -- Tiered rates (JSONB)
  tier_config JSONB, -- [{"min": 0, "max": 50000, "rate": 1.5}, ...]
  
  -- Formula (for complex calculations)
  formula_expression TEXT, -- SQL-safe expression
  
  -- Additional fees
  includes_cope BOOLEAN DEFAULT false,
  cope_amount DECIMAL(8,2),
  includes_pac BOOLEAN DEFAULT false,
  pac_amount DECIMAL(8,2),
  includes_initiation BOOLEAN DEFAULT false,
  initiation_fee DECIMAL(8,2),
  
  -- Frequency
  billing_frequency VARCHAR(50) DEFAULT 'monthly' CHECK (
    billing_frequency IN ('weekly', 'bi-weekly', 'monthly', 'quarterly', 'annual')
  ),
  
  -- Active date range
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT dues_rules_tenant_code_unique UNIQUE (tenant_id, rule_code)
);

CREATE INDEX idx_dues_rules_tenant ON dues_rules(tenant_id);
CREATE INDEX idx_dues_rules_classification ON dues_rules(member_classification);
CREATE INDEX idx_dues_rules_active ON dues_rules(is_active, effective_from, effective_until);
```

### 2. Member Dues Assignments
```sql
CREATE TABLE member_dues_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES dues_rules(id) ON DELETE RESTRICT,
  
  -- Override settings
  override_enabled BOOLEAN DEFAULT false,
  override_amount DECIMAL(10,2),
  override_reason TEXT,
  
  -- Exemptions
  is_exempt BOOLEAN DEFAULT false,
  exemption_reason VARCHAR(255),
  exempt_from DATE,
  exempt_until DATE,
  
  -- Status
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID NOT NULL,
  
  CONSTRAINT member_dues_unique UNIQUE (tenant_id, member_id)
);

CREATE INDEX idx_member_dues_tenant ON member_dues_assignments(tenant_id);
CREATE INDEX idx_member_dues_member ON member_dues_assignments(member_id);
CREATE INDEX idx_member_dues_rule ON member_dues_assignments(rule_id);
```

### 3. Dues Transactions
```sql
CREATE TABLE dues_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  
  -- Period
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  
  -- Calculation breakdown
  base_dues DECIMAL(10,2) NOT NULL DEFAULT 0,
  cope_amount DECIMAL(8,2) DEFAULT 0,
  pac_amount DECIMAL(8,2) DEFAULT 0,
  initiation_fee DECIMAL(8,2) DEFAULT 0,
  arrears_amount DECIMAL(10,2) DEFAULT 0,
  late_fees DECIMAL(8,2) DEFAULT 0,
  adjustments DECIMAL(10,2) DEFAULT 0,
  
  -- Total
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Payment status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'partial', 'overdue', 'waived', 'written_off')
  ),
  
  -- Payment tracking
  paid_amount DECIMAL(10,2) DEFAULT 0,
  outstanding_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Remittance tracking
  remittance_batch_id UUID,
  employer_id UUID,
  
  -- Calculation details
  calculation_details JSONB, -- Full breakdown for audit
  rule_id UUID REFERENCES dues_rules(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dues_trans_tenant ON dues_transactions(tenant_id);
CREATE INDEX idx_dues_trans_member ON dues_transactions(member_id);
CREATE INDEX idx_dues_trans_status ON dues_transactions(status);
CREATE INDEX idx_dues_trans_period ON dues_transactions(billing_period_start, billing_period_end);
CREATE INDEX idx_dues_trans_due_date ON dues_transactions(due_date);
```

### 4. Employer Remittances
```sql
CREATE TABLE employer_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL,
  
  -- Remittance details
  remittance_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Amounts
  total_amount DECIMAL(12,2) NOT NULL,
  member_count INTEGER NOT NULL,
  
  -- Payment method
  payment_method VARCHAR(50) CHECK (
    payment_method IN ('eft', 'ach', 'wire', 'cheque', 'credit_card', 'payroll_deduction')
  ),
  
  -- Payment details
  reference_number VARCHAR(100),
  transaction_id TEXT,
  
  -- File processing
  source_file_name VARCHAR(500),
  source_file_url TEXT,
  file_format VARCHAR(50), -- 'csv', 'excel', 'xml', 'edi'
  
  -- Reconciliation
  reconciliation_status VARCHAR(50) DEFAULT 'pending' CHECK (
    reconciliation_status IN ('pending', 'matched', 'partial', 'variance', 'disputed')
  ),
  matched_transactions INTEGER DEFAULT 0,
  unmatched_transactions INTEGER DEFAULT 0,
  variance_amount DECIMAL(10,2) DEFAULT 0,
  
  -- GL mapping
  gl_account VARCHAR(50),
  gl_posted_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'received' CHECK (
    status IN ('received', 'processing', 'posted', 'rejected')
  ),
  
  -- Metadata
  notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_remittances_tenant ON employer_remittances(tenant_id);
CREATE INDEX idx_remittances_employer ON employer_remittances(employer_id);
CREATE INDEX idx_remittances_date ON employer_remittances(remittance_date);
CREATE INDEX idx_remittances_status ON employer_remittances(reconciliation_status);
```

### 5. Arrears Management
```sql
CREATE TABLE arrears_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  
  -- Arrears details
  total_owed DECIMAL(10,2) NOT NULL,
  original_amount DECIMAL(10,2) NOT NULL,
  payments_made DECIMAL(10,2) DEFAULT 0,
  
  -- Age tracking
  oldest_unpaid_period DATE NOT NULL,
  months_in_arrears INTEGER NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (
    status IN ('active', 'payment_plan', 'collection', 'waived', 'written_off', 'resolved')
  ),
  
  -- Payment plan
  payment_plan_id UUID,
  payment_plan_amount DECIMAL(8,2),
  payment_plan_frequency VARCHAR(50),
  
  -- Collections
  collection_stage VARCHAR(50), -- 'notice_1', 'notice_2', 'final_notice', 'legal'
  last_notice_sent_date DATE,
  next_action_date DATE,
  
  -- Good standing impact
  blocks_voting BOOLEAN DEFAULT false,
  blocks_benefits BOOLEAN DEFAULT false,
  blocks_events BOOLEAN DEFAULT false,
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_type VARCHAR(50),
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_arrears_tenant ON arrears_cases(tenant_id);
CREATE INDEX idx_arrears_member ON arrears_cases(member_id);
CREATE INDEX idx_arrears_status ON arrears_cases(status);
CREATE INDEX idx_arrears_age ON arrears_cases(months_in_arrears);
```

---

## API Endpoints

### Dues Rules Management
```
POST   /api/dues/rules                    - Create dues rule
GET    /api/dues/rules                    - List rules for tenant
GET    /api/dues/rules/:id                - Get rule details
PUT    /api/dues/rules/:id                - Update rule
DELETE /api/dues/rules/:id                - Delete rule
POST   /api/dues/rules/:id/calculate      - Test calculation
```

### Member Dues
```
POST   /api/dues/members/:id/assign       - Assign rule to member
GET    /api/dues/members/:id/statement    - Get dues statement
POST   /api/dues/members/:id/calculate    - Calculate current dues
GET    /api/dues/members/:id/history      - Payment history
POST   /api/dues/members/:id/waiver       - Request waiver
```

### Transactions
```
POST   /api/dues/transactions             - Create transaction
GET    /api/dues/transactions             - List transactions
GET    /api/dues/transactions/:id         - Get transaction
POST   /api/dues/transactions/:id/pay     - Record payment
POST   /api/dues/transactions/bulk        - Bulk create/update
```

### Remittances
```
POST   /api/remittances                   - Create remittance
POST   /api/remittances/upload            - Upload remittance file
GET    /api/remittances                   - List remittances
GET    /api/remittances/:id               - Get remittance details
POST   /api/remittances/:id/reconcile     - Reconcile remittance
POST   /api/remittances/:id/post-to-gl    - Post to GL
```

### Arrears
```
GET    /api/arrears                       - List all arrears cases
GET    /api/arrears/members/:id           - Member arrears details
POST   /api/arrears/payment-plan          - Create payment plan
POST   /api/arrears/:id/waive             - Waive arrears
POST   /api/arrears/:id/write-off         - Write off debt
```

---

## Calculation Engine

### TypeScript Interface
```typescript
interface DuesCalculationInput {
  memberId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  grossIncome?: number;
  hoursWorked?: number;
  overrides?: {
    baseAmount?: number;
    copeAmount?: number;
    pacAmount?: number;
  };
}

interface DuesCalculationResult {
  transactionId: string;
  memberId: string;
  period: { start: Date; end: Date };
  breakdown: {
    baseDues: number;
    cope: number;
    pac: number;
    initiation: number;
    arrears: number;
    lateFees: number;
    adjustments: number;
  };
  total: number;
  dueDate: Date;
  ruleApplied: string;
  calculationDetails: object;
}
```

### Calculation Logic
```typescript
async function calculateMemberDues(
  input: DuesCalculationInput
): Promise<DuesCalculationResult> {
  // 1. Get member's assigned dues rule
  const assignment = await getMemberDuesAssignment(input.memberId);
  
  // 2. Handle overrides or exemptions
  if (assignment.is_exempt) {
    return createExemptTransaction(input);
  }
  
  if (assignment.override_enabled) {
    return createOverrideTransaction(input, assignment.override_amount);
  }
  
  // 3. Get applicable rule
  const rule = await getDuesRule(assignment.rule_id);
  
  // 4. Calculate base dues
  let baseDues = 0;
  switch (rule.calculation_type) {
    case 'percentage':
      baseDues = (input.grossIncome || 0) * (rule.percentage_rate / 100);
      break;
    case 'flat_rate':
      baseDues = rule.flat_amount;
      break;
    case 'hourly':
      baseDues = (input.hoursWorked || 0) * rule.hourly_rate;
      break;
    case 'tiered':
      baseDues = calculateTiered(input.grossIncome, rule.tier_config);
      break;
    case 'formula':
      baseDues = evaluateFormula(rule.formula_expression, input);
      break;
  }
  
  // 5. Add additional fees
  const cope = rule.includes_cope ? rule.cope_amount : 0;
  const pac = rule.includes_pac ? rule.pac_amount : 0;
  const initiation = rule.includes_initiation ? rule.initiation_fee : 0;
  
  // 6. Check for arrears
  const arrears = await getOutstandingArrears(input.memberId);
  
  // 7. Calculate late fees
  const lateFees = await calculateLateFees(input.memberId);
  
  // 8. Apply adjustments
  const adjustments = input.overrides?.baseAmount 
    ? input.overrides.baseAmount - baseDues 
    : 0;
  
  // 9. Calculate total
  const total = baseDues + cope + pac + initiation + arrears + lateFees + adjustments;
  
  // 10. Create transaction record
  return await createDuesTransaction({
    memberId: input.memberId,
    period: { start: input.billingPeriodStart, end: input.billingPeriodEnd },
    breakdown: { baseDues, cope, pac, initiation, arrears, lateFees, adjustments },
    total,
    dueDate: calculateDueDate(input.billingPeriodEnd, rule.billing_frequency),
    ruleId: rule.id
  });
}
```

---

## Stripe Integration

### Payment Processing
```typescript
// Create payment intent for member
async function createPaymentIntent(
  memberId: string,
  transactionId: string,
  amount: number
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'cad',
    metadata: {
      tenant_id: getTenantId(),
      member_id: memberId,
      transaction_id: transactionId,
      type: 'dues_payment'
    },
    automatic_payment_methods: { enabled: true }
  });
  
  return paymentIntent;
}

// Webhook handler for payment events
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }
}
```

---

## Workflows

### Monthly Dues Calculation Workflow
```yaml
trigger: schedule (1st of month, 2am)
steps:
  1. Get all active members
  2. For each member:
     - Calculate dues for previous month
     - Create transaction record
     - Check for arrears
     - Send statement notification
  3. Generate batch report
  4. Notify admin
```

### Payment Collection Workflow
```yaml
trigger: payment_received
steps:
  1. Validate payment amount
  2. Match to transaction(s)
  3. Update transaction status
  4. Update arrears if applicable
  5. Send receipt
  6. Update good-standing status
```

### Arrears Management Workflow
```yaml
trigger: schedule (weekly)
steps:
  1. Identify overdue transactions (30+ days)
  2. Create/update arrears cases
  3. Determine collection stage
  4. Send appropriate notice
  5. Update member restrictions
  6. Escalate if needed
```

---

## Testing Requirements

### Unit Tests
- Calculation engine accuracy (all methods)
- Rule validation logic
- Override and exemption handling
- Tiered rate calculations
- Arrears accumulation

### Integration Tests
- End-to-end payment flow
- Remittance file processing
- Stripe webhook handling
- Bulk transaction creation
- GL posting

### Load Tests
- 10,000 member calculation batch
- Concurrent payment processing
- Large remittance file upload (50MB+)
- Report generation under load

---

## Security & Compliance

### Data Protection
- PCI DSS compliance for payment data
- Encryption at rest for financial records
- Audit trail for all transactions
- Role-based access to financial data

### SOC-2 Requirements
- Immutable transaction records
- Automated reconciliation
- Variance reporting
- Fraud detection alerts

### Financial Audit Trail
```sql
CREATE TABLE financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  reason TEXT
);
```

---

## Acceptance Criteria

- [ ] All calculation types implemented and tested
- [ ] Payment processing integrated with Stripe
- [ ] Remittance file upload supports CSV, Excel, XML
- [ ] Automated dues calculation runs monthly
- [ ] Arrears detection and notification automated
- [ ] Member portal shows dues statement
- [ ] Admin dashboard displays financial metrics
- [ ] Audit trail captures all financial changes
- [ ] RLS policies enforce tenant isolation
- [ ] API documentation complete with examples
- [ ] Load tested with 10K+ members
- [ ] PCI DSS compliance verified
