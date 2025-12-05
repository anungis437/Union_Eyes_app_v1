# Phase 4: Strike & Hardship Fund Module
**Technical Specification v1.0**

## Executive Summary

**Objective:** Implement strike fund management, picket tracking, stipend disbursement, and hardship assistance system.

**Priority:** CRITICAL - Essential for strike readiness  
**Timeline:** 6-8 weeks  
**Dependencies:** Financial module, member management, notification system  

---

## Database Schema

### 1. Strike Funds
```sql
CREATE TABLE strike_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Fund details
  fund_name VARCHAR(255) NOT NULL,
  fund_type VARCHAR(50) CHECK (fund_type IN ('strike', 'hardship', 'emergency', 'defense')),
  
  -- Financial tracking
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  target_balance DECIMAL(15,2),
  
  -- Funding sources
  member_contributions DECIMAL(15,2) DEFAULT 0,
  external_donations DECIMAL(15,2) DEFAULT 0,
  grants DECIMAL(15,2) DEFAULT 0,
  investment_returns DECIMAL(15,2) DEFAULT 0,
  
  -- Disbursements
  total_disbursed DECIMAL(15,2) DEFAULT 0,
  pending_disbursements DECIMAL(15,2) DEFAULT 0,
  
  -- Trustee governance
  requires_trustee_approval BOOLEAN DEFAULT true,
  trustee_ids UUID[],
  approval_threshold INTEGER DEFAULT 2, -- Number of trustees required
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  locked_until DATE, -- Lock fund during non-strike periods
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_strike_funds_tenant ON strike_funds(tenant_id);
CREATE INDEX idx_strike_funds_type ON strike_funds(fund_type);
```

### 2. Member Fund Eligibility
```sql
CREATE TABLE fund_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  fund_id UUID NOT NULL REFERENCES strike_funds(id) ON DELETE CASCADE,
  
  -- Eligibility criteria
  is_eligible BOOLEAN DEFAULT true,
  eligibility_reason TEXT,
  
  -- Requirements tracking
  months_in_good_standing INTEGER NOT NULL DEFAULT 0,
  required_months INTEGER DEFAULT 6,
  contributions_current BOOLEAN DEFAULT true,
  picket_hours_completed INTEGER DEFAULT 0,
  required_picket_hours INTEGER DEFAULT 20,
  
  -- Benefit limits
  max_weekly_benefit DECIMAL(8,2),
  max_total_benefit DECIMAL(10,2),
  benefit_duration_weeks INTEGER,
  
  -- Status
  status VARCHAR(50) DEFAULT 'eligible' CHECK (
    status IN ('eligible', 'ineligible', 'suspended', 'expired')
  ),
  
  -- Dates
  eligible_from DATE,
  eligible_until DATE,
  last_reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fund_eligibility_unique UNIQUE (tenant_id, member_id, fund_id)
);

CREATE INDEX idx_fund_eligibility_member ON fund_eligibility(member_id);
CREATE INDEX idx_fund_eligibility_fund ON fund_eligibility(fund_id);
CREATE INDEX idx_fund_eligibility_status ON fund_eligibility(status);
```

### 3. Picket Attendance
```sql
CREATE TABLE picket_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  
  -- Picket details
  picket_location VARCHAR(255) NOT NULL,
  picket_date DATE NOT NULL,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ,
  
  -- Check-in method
  checkin_method VARCHAR(50) CHECK (
    checkin_method IN ('nfc_tap', 'qr_scan', 'manual', 'gps', 'supervisor')
  ),
  checkin_device_id TEXT,
  checkin_gps_coords POINT,
  
  -- Hours tracking
  hours_logged DECIMAL(4,2),
  break_time_minutes INTEGER DEFAULT 0,
  
  -- Verification
  verified_by UUID,
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'disputed', 'rejected')
  ),
  verification_notes TEXT,
  
  -- Stipend eligibility
  eligible_for_stipend BOOLEAN DEFAULT true,
  stipend_amount DECIMAL(8,2),
  stipend_paid BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  photos TEXT[], -- URLs to photo uploads
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_picket_attendance_member ON picket_attendance(member_id);
CREATE INDEX idx_picket_attendance_date ON picket_attendance(picket_date);
CREATE INDEX idx_picket_attendance_location ON picket_attendance(picket_location);
CREATE INDEX idx_picket_attendance_status ON picket_attendance(verification_status);
```

### 4. Stipend Disbursements
```sql
CREATE TABLE stipend_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  fund_id UUID NOT NULL REFERENCES strike_funds(id),
  
  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Calculation
  base_stipend DECIMAL(8,2) NOT NULL,
  picket_hours DECIMAL(6,2) NOT NULL,
  bonus_amount DECIMAL(6,2) DEFAULT 0, -- Perfect attendance, etc.
  deductions DECIMAL(6,2) DEFAULT 0,
  total_amount DECIMAL(8,2) NOT NULL,
  
  -- Payment details
  payment_method VARCHAR(50) CHECK (
    payment_method IN ('direct_deposit', 'prepaid_card', 'cheque', 'e_transfer')
  ),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled')
  ),
  
  -- Banking info (encrypted)
  bank_account_last4 VARCHAR(4),
  prepaid_card_id TEXT,
  
  -- Processing
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- External reference
  transaction_id TEXT,
  payment_provider VARCHAR(50),
  
  -- Audit
  calculation_details JSONB,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stipend_member ON stipend_disbursements(member_id);
CREATE INDEX idx_stipend_fund ON stipend_disbursements(fund_id);
CREATE INDEX idx_stipend_status ON stipend_disbursements(payment_status);
CREATE INDEX idx_stipend_period ON stipend_disbursements(period_start, period_end);
```

### 5. Public Donations (Crowd-funding)
```sql
CREATE TABLE public_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES strike_funds(id),
  
  -- Donor info
  donor_name VARCHAR(255),
  donor_email VARCHAR(255),
  is_anonymous BOOLEAN DEFAULT false,
  
  -- Donation details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  
  -- Payment processing
  payment_method VARCHAR(50),
  stripe_payment_id TEXT,
  stripe_charge_id TEXT,
  
  -- Tax receipting
  requires_receipt BOOLEAN DEFAULT false,
  receipt_issued BOOLEAN DEFAULT false,
  receipt_number VARCHAR(100),
  receipt_issued_at TIMESTAMPTZ,
  
  -- Campaign tracking
  campaign_id UUID,
  source VARCHAR(100), -- 'web', 'social_media', 'email', 'qr_code'
  referrer TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  
  -- Public display
  show_on_fundraiser BOOLEAN DEFAULT true,
  public_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_fund ON public_donations(fund_id);
CREATE INDEX idx_donations_status ON public_donations(status);
CREATE INDEX idx_donations_campaign ON public_donations(campaign_id);
CREATE INDEX idx_donations_created ON public_donations(created_at DESC);
```

### 6. Hardship Applications
```sql
CREATE TABLE hardship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  fund_id UUID NOT NULL REFERENCES strike_funds(id),
  
  -- Application details
  hardship_type VARCHAR(50) CHECK (
    hardship_type IN ('medical', 'housing', 'utilities', 'food', 'childcare', 'transportation', 'other')
  ),
  description TEXT NOT NULL,
  amount_requested DECIMAL(10,2) NOT NULL,
  urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  
  -- Supporting documentation
  documents JSONB, -- Array of file URLs
  
  -- Review process
  status VARCHAR(50) DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'under_review', 'approved', 'denied', 'paid')
  ),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Approval
  approved_amount DECIMAL(10,2),
  disbursement_id UUID REFERENCES stipend_disbursements(id),
  
  -- Metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hardship_member ON hardship_applications(member_id);
CREATE INDEX idx_hardship_fund ON hardship_applications(fund_id);
CREATE INDEX idx_hardship_status ON hardship_applications(status);
CREATE INDEX idx_hardship_urgency ON hardship_applications(urgency);
```

---

## API Endpoints

### Fund Management
```
POST   /api/strike-funds                  - Create fund
GET    /api/strike-funds                  - List funds
GET    /api/strike-funds/:id              - Get fund details
PUT    /api/strike-funds/:id              - Update fund
POST   /api/strike-funds/:id/lock         - Lock fund
POST   /api/strike-funds/:id/unlock       - Unlock fund
GET    /api/strike-funds/:id/balance      - Current balance
GET    /api/strike-funds/:id/forecast     - AI burn-rate forecast
```

### Picket Attendance
```
POST   /api/picket/check-in               - Check in to picket
POST   /api/picket/check-out              - Check out from picket
GET    /api/picket/attendance             - List attendance records
GET    /api/picket/members/:id/hours      - Member's total hours
POST   /api/picket/nfc-tap                - NFC tap check-in
POST   /api/picket/qr-scan                - QR code check-in
POST   /api/picket/:id/verify             - Verify attendance
```

### Stipend Processing
```
POST   /api/stipends/calculate            - Calculate weekly stipends
GET    /api/stipends                      - List disbursements
GET    /api/stipends/members/:id          - Member's stipend history
POST   /api/stipends/:id/approve          - Approve disbursement
POST   /api/stipends/:id/process          - Process payment
POST   /api/stipends/bulk-approve         - Bulk approve stipends
```

### Public Donations
```
POST   /api/donations/create-intent       - Create Stripe intent
POST   /api/donations                     - Record donation
GET    /api/donations/campaign/:id        - Campaign donations
POST   /api/donations/:id/receipt         - Issue tax receipt
GET    /api/donations/leaderboard         - Top donors (public)
```

### Hardship Applications
```
POST   /api/hardship/apply                - Submit application
GET    /api/hardship/applications         - List applications
GET    /api/hardship/:id                  - Get application
POST   /api/hardship/:id/review           - Review application
POST   /api/hardship/:id/approve          - Approve application
POST   /api/hardship/:id/deny             - Deny application
```

---

## NFC Picket Check-In System

### Hardware Requirements
- NFC-enabled tablets/phones at picket lines
- Optional: NFC cards for members without smartphones

### Implementation
```typescript
interface NFCCheckIn {
  memberId: string;
  nfcCardId: string;
  location: { lat: number; lon: number };
  timestamp: Date;
}

async function handleNFCTap(tapData: NFCCheckIn) {
  // 1. Verify member identity
  const member = await verifyNFCCard(tapData.nfcCardId);
  
  // 2. Check for existing check-in
  const existingCheckIn = await getActivePicketShift(member.id);
  
  if (existingCheckIn) {
    // Check-out
    return await checkOutFromPicket(existingCheckIn.id, tapData.timestamp);
  } else {
    // Check-in
    return await checkInToPicket({
      memberId: member.id,
      location: detectPicketLocation(tapData.location),
      checkinMethod: 'nfc_tap',
      deviceId: tapData.nfcCardId,
      shiftStart: tapData.timestamp
    });
  }
}
```

---

## AI Burn-Rate Predictor

### Model Inputs
- Current fund balance
- Number of striking members
- Average weekly stipend
- Historical disbursement rates
- Strike duration estimate
- Donation inflow rate

### Prediction Output
```typescript
interface BurnRateForecast {
  currentBalance: number;
  weeklyBurnRate: number;
  projectedDepletion: Date | null;
  weeksRemaining: number;
  confidence: number; // 0-1
  recommendations: string[];
  scenarios: {
    optimistic: { depletes: Date; weeksRemaining: number };
    realistic: { depletes: Date; weeksRemaining: number };
    pessimistic: { depletes: Date; weeksRemaining: number };
  };
}
```

### Algorithm
```typescript
async function predictFundBurnRate(fundId: string): Promise<BurnRateForecast> {
  const fund = await getStrikeFund(fundId);
  const activeMembers = await getEligibleMemberCount(fundId);
  const avgStipend = await calculateAverageStipend(fundId);
  const historicalData = await getHistoricalDisbursements(fundId, 12); // months
  const donationRate = await calculateAverageDonationRate(fundId);
  
  // Calculate weekly burn rate
  const weeklyStipends = activeMembers * avgStipend;
  const weeklyDonations = donationRate / 4.33; // Monthly to weekly
  const netBurn = weeklyStipends - weeklyDonations;
  
  // Project depletion
  const weeksRemaining = fund.current_balance / netBurn;
  const depletionDate = addWeeks(new Date(), weeksRemaining);
  
  // Generate scenarios
  const scenarios = {
    optimistic: calculateScenario(netBurn * 0.7),
    realistic: calculateScenario(netBurn),
    pessimistic: calculateScenario(netBurn * 1.3)
  };
  
  // Recommendations
  const recommendations = generateRecommendations(weeksRemaining, netBurn);
  
  return {
    currentBalance: fund.current_balance,
    weeklyBurnRate: netBurn,
    projectedDepletion: depletionDate,
    weeksRemaining: Math.floor(weeksRemaining),
    confidence: calculateConfidence(historicalData),
    recommendations,
    scenarios
  };
}
```

---

## Workflows

### Weekly Stipend Processing
```yaml
trigger: schedule (Friday 5pm)
steps:
  1. Calculate picket hours for week (Mon-Sun)
  2. Determine eligible members
  3. Calculate stipend amounts
  4. Create disbursement records
  5. Route for trustee approval
  6. Process approved payments
  7. Send payment notifications
  8. Update fund balance
```

### Hardship Application Review
```yaml
trigger: application_submitted
steps:
  1. Auto-check eligibility criteria
  2. Assign to reviewer
  3. Notify reviewer (email + push)
  4. Review process (3-day SLA)
  5. Trustee approval if > threshold
  6. Create disbursement if approved
  7. Notify applicant of decision
```

### Public Donation Processing
```yaml
trigger: stripe_webhook (payment_succeeded)
steps:
  1. Validate payment
  2. Record donation in database
  3. Update fund balance
  4. Send thank-you email
  5. Issue tax receipt if requested
  6. Update public fundraiser display
  7. Post milestone achievements to social
```

---

## Acceptance Criteria

- [ ] Strike fund creation and management
- [ ] Member eligibility rules engine
- [ ] NFC picket check-in functional
- [ ] QR code alternative implemented
- [ ] GPS verification within 100m radius
- [ ] Weekly stipend calculation automated
- [ ] Prepaid card integration (optional)
- [ ] Public donation page with Stripe
- [ ] Real-time fundraiser progress display
- [ ] Tax receipt generation (CRA compliant)
- [ ] Hardship application workflow
- [ ] Trustee approval system
- [ ] AI burn-rate forecast
- [ ] Multi-scenario projections
- [ ] Admin dashboard with fund metrics
- [ ] Member mobile app integration
- [ ] Audit trail for all disbursements
