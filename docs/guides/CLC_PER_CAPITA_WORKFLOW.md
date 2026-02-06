# CLC Per-Capita Integration Service - User & Admin Guide

## Table of Contents
1. [Overview](#overview)
2. [User Guide](#user-guide)
3. [Admin Guide](#admin-guide)
4. [Technical Reference](#technical-reference)

---

## Overview

### What is Per-Capita Tax?

Per-capita tax is a monthly payment made by local unions to their parent organizations (provincial federations, national unions, or the Canadian Labour Congress). The payment is calculated based on the number of members in good standing, multiplied by a fixed per-capita rate.

**Example:**
- Local 456 has 500 total members
- 480 members are in good standing (20 suspended)
- Per-capita rate is $5.00/member
- Monthly remittance: 480 × $5.00 = **$2,400.00**

### Why It Matters

Per-capita taxes fund:
- **National/provincial operations**: Staff salaries, office costs, advocacy
- **Member services**: Legal support, collective bargaining assistance, training
- **Political action**: Lobbying, campaigns, policy development
- **Strike funds**: Support for locals in labor disputes
- **Solidarity programs**: International labor support, community initiatives

**Compliance is critical**: Late or missing remittances can result in:
- Loss of voting rights at conventions
- Suspension of member services
- Financial penalties
- Damage to affiliate relationships

---

## User Guide

### Viewing Remittances

#### Dashboard Overview

Access the Per-Capita Remittances dashboard at:
```
/admin/clc/remittances
```

**Dashboard Features:**
1. **Summary Cards** (top section)
   - **Total Due**: Sum of all remittances (pending + submitted + paid)
   - **Total Paid**: Amount successfully paid to parent org
   - **Pending**: Count of remittances awaiting submission
   - **Overdue**: Count of remittances past due date (red alert)

2. **Overdue Alert** (when applicable)
   - Red warning banner showing count of overdue remittances
   - Indicates immediate action required

3. **12-Month Trend Chart**
   - Line graph showing remittance amounts over last 12 months
   - Helps identify seasonal patterns or issues

4. **Remittances Table**
   - List of all remittances with key details
   - Columns: Period, From (local union), To (parent org), Members, Rate, Amount, Due Date, Status, Actions

#### Filtering Remittances

Use filters to narrow down the list:
- **Status**: All, Pending, Submitted, Paid, Overdue
- **Month**: Specific month (January-December)
- **Year**: Fiscal year
- **Organization ID**: Filter by local union

**Steps:**
1. Select filter values
2. Click **"Apply Filters"**
3. Click **"Clear"** to reset all filters
4. Click **"Refresh"** to reload data

### Understanding Status Badges

| Badge | Color | Meaning | Next Action |
|-------|-------|---------|-------------|
| **Pending** | Yellow | Calculated but not submitted | Submit payment |
| **Submitted** | Blue | Payment submitted to parent | Wait for confirmation |
| **Paid** | Green | Payment confirmed received | None (complete) |
| **Overdue** | Red | Past due date, not paid | Submit immediately |

### Submitting Remittances

**For single remittances:**
1. Find the pending remittance in the table
2. Click **"Submit"** button in Actions column
3. Confirm submission in popup
4. Status changes to **"Submitted"**
5. Parent organization receives notification

**Note**: Only remittances with status "Pending" can be submitted. Submitted or Paid remittances cannot be resubmitted.

### Downloading Reports

#### Export Selected Remittances

1. Check boxes next to remittances to export
2. Click export button:
   - **"Export CSV"**: Simple spreadsheet format for Excel/Google Sheets
   - **"Export XML"**: Structured format for CLC finance portal upload
3. File downloads automatically to your Downloads folder

**CSV File Contents:**
- Organization name, CLC affiliate code
- Remittance period (month/year)
- Member counts (total, good standing, remittable)
- Per-capita rate and total amount
- Due date and status

**XML File Structure:**
- CLC-compliant EDI format
- Includes header (metadata), lines (member details), summary (totals)
- Ready for upload to CLC finance system

#### Export StatCan LAB-05302

For annual Statistics Canada Labour Organization Survey:

1. Set **Year** filter to fiscal year (e.g., 2024)
2. Click **"StatCan LAB-05302"** button
3. Download text file with government reporting format

**StatCan File Contents:**
- Organization info (name, CLC code, address)
- Reporting period (fiscal year)
- Financial summary (revenue by category)
- Member counts (total, good standing, by classification)

**When to use**: CLC requests this annually for Statistics Canada compliance reporting.

### Viewing Remittance Details

**From the table:**
1. Click on remittance row to expand details
2. View:
   - Full organization names and codes
   - Detailed member breakdown
   - Payment history (submitted date, paid date)
   - Notes and comments

**Member Counts Explained:**
- **Total Members**: All members on roster
- **Good Standing Members**: Members current on dues, not suspended
- **Remittable Members**: Members counted for per-capita (usually = good standing)

Formula: `Total Amount = Remittable Members × Per-Capita Rate`

---

## Admin Guide

### Configuration

#### Setting Per-Capita Rates

Rates are configured in the database per parent organization and effective date:

**Database Table**: `per_capita_rates`

**Columns:**
- `organization_id`: Parent org receiving remittances (CLC, provincial federation)
- `effective_date`: Date rate becomes active
- `rate_amount`: Per-capita amount (e.g., 5.00)
- `rate_type`: 'monthly', 'quarterly', 'annual'

**Example Query:**
```sql
INSERT INTO per_capita_rates (organization_id, effective_date, rate_amount, rate_type)
VALUES ('clc-national', '2024-01-01', 5.00, 'monthly');
```

**Rate Changes:**
- Create new row with new `effective_date`
- System automatically uses correct rate for each period
- Historical rates preserved for audit trail

#### Setting Due Dates

Default rule: **Due date = last day of month following remittance period**

Example:
- December 2024 remittance → Due January 31, 2025
- January 2025 remittance → Due February 28, 2025

**Grace Period**: Configure in `organization_settings`:
```sql
UPDATE organization_settings
SET setting_value = '7'
WHERE setting_key = 'per_capita_grace_period_days'
AND organization_id = 'clc-national';
```

This adds 7-day grace period before marking overdue.

#### Configuring Cron Schedule

Monthly calculation runs automatically on **1st of month at 00:00 (midnight)**.

**Vercel Cron Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-per-capita",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

**Schedule Format**: Cron expression `minute hour day month weekday`
- `0 0 1 * *` = minute 0, hour 0 (midnight), day 1 (first of month), any month, any weekday

**To change schedule:**
1. Edit `vercel.json`
2. Commit and push to deploy
3. Vercel automatically updates cron

**Manual Trigger** (for testing or missed runs):
```bash
curl -X GET "https://your-domain.com/api/cron/monthly-per-capita?CRON_SECRET=your_secret"
```

### Troubleshooting

#### Common Errors

**Error: "Remittance validation failed"**

**Cause**: Data integrity issue preventing export

**Diagnosis:**
1. Check validation errors in response
2. Common issues:
   - Missing organization (local union or parent not found)
   - Invalid member counts (remittable > good standing > total)
   - Wrong calculation (amount ≠ members × rate)
   - Missing dates or account codes

**Fix:**
```sql
-- Check organization exists
SELECT * FROM organizations WHERE id = 'org-123';

-- Verify member counts logic
SELECT 
  total_members,
  good_standing_members,
  remittable_members
FROM per_capita_remittances
WHERE id = 'rem-123';

-- Recalculate amount
UPDATE per_capita_remittances
SET total_amount = remittable_members * per_capita_rate::numeric
WHERE id = 'rem-123';
```

---

**Error: "Failed to calculate remittances"**

**Cause**: Cron job or API endpoint encountered error

**Diagnosis:**
1. Check server logs:
   ```bash
   vercel logs --follow
   ```
2. Look for errors in `/api/cron/monthly-per-capita` or `/api/admin/clc/remittances`

**Common Causes:**
- Database connection timeout
- Missing parent organization for local union
- No per-capita rate configured for period

**Fix:**
```sql
-- Check all locals have parent orgs
SELECT o.id, o.name, o.parent_organization_id
FROM organizations o
WHERE o.type = 'local_union'
AND o.parent_organization_id IS NULL;

-- Add missing parent relationships
UPDATE organizations
SET parent_organization_id = 'clc-national'
WHERE id IN ('org-123', 'org-456');

-- Verify rates configured
SELECT * FROM per_capita_rates
WHERE organization_id = 'clc-national'
AND effective_date <= CURRENT_DATE
ORDER BY effective_date DESC
LIMIT 1;
```

---

**Error: "Export failed - invalid format"**

**Cause**: Requested export format not supported

**Supported Formats:**
- `csv` - Comma-separated values
- `xml` - CLC XML/EDI format
- `edi` - Alias for XML
- `statcan` - Statistics Canada LAB-05302

**Fix**: Use correct format parameter in URL:
```
/api/admin/clc/remittances/export?format=csv
/api/admin/clc/remittances/export?format=xml
/api/admin/clc/remittances/export?format=statcan
```

---

#### Failed Calculations

**Scenario**: Monthly cron ran but some orgs have no remittances

**Investigation:**
```sql
-- Find orgs without December 2024 remittance
SELECT o.id, o.name
FROM organizations o
WHERE o.type = 'local_union'
AND o.is_active = true
AND NOT EXISTS (
  SELECT 1
  FROM per_capita_remittances r
  WHERE r.from_organization_id = o.id
  AND r.remittance_month = 12
  AND r.remittance_year = 2024
);
```

**Possible Causes:**
1. **No members in good standing**: Org has 0 remittable members
2. **Missing membership data**: `memberships` table not updated
3. **Org inactive**: Check `is_active` flag
4. **Parent org missing**: No `parent_organization_id` set

**Manual Calculation:**
```typescript
// Via API (requires admin auth)
POST /api/admin/clc/remittances
Body: {
  "organizationId": "org-123",
  "month": 12,
  "year": 2024,
  "saveResults": true
}
```

Or direct service call:
```typescript
import { PerCapitaCalculator } from '@/services/clc/per-capita-calculator';

const calculator = new PerCapitaCalculator();
const results = await calculator.calculatePerCapita('org-123', 12, 2024);
await calculator.savePerCapitaRemittances(results);
```

---

### Manual Operations

#### Recalculate Remittances

**When needed:**
- Membership data was corrected after initial calculation
- Per-capita rate changed retroactively
- Member status updated (suspended → active)

**Steps:**
1. Delete incorrect remittance:
   ```sql
   DELETE FROM per_capita_remittances
   WHERE from_organization_id = 'org-123'
   AND remittance_month = 12
   AND remittance_year = 2024;
   ```

2. Recalculate via API:
   ```bash
   curl -X POST "https://your-domain.com/api/admin/clc/remittances" \
     -H "Content-Type: application/json" \
     -d '{
       "organizationId": "org-123",
       "month": 12,
       "year": 2024,
       "saveResults": true
     }'
   ```

3. Verify new calculation:
   ```sql
   SELECT * FROM per_capita_remittances
   WHERE from_organization_id = 'org-123'
   AND remittance_month = 12
   AND remittance_year = 2024;
   ```

---

#### Mark Remittance as Paid

**When needed:**
- Payment received outside system (e.g., manual check, wire transfer)
- CLC confirmed payment but system status still "Submitted"

**Via API:**
```bash
curl -X POST "https://your-domain.com/api/admin/clc/remittances/rem-123/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "paidDate": "2025-01-15",
    "notes": "Manual confirmation - wire transfer received"
  }'
```

**Via Database:**
```sql
UPDATE per_capita_remittances
SET 
  status = 'paid',
  paid_date = '2025-01-15',
  notes = 'Manual confirmation - wire transfer received',
  updated_at = NOW()
WHERE id = 'rem-123';
```

---

#### Void/Cancel Remittance

**When needed:**
- Duplicate remittance created
- Calculation error discovered, needs recalculation
- Org merged/dissolved mid-period

**Best Practice**: Don't DELETE - soft delete or mark as voided

```sql
-- Add 'voided' status if not exists
ALTER TYPE remittance_status ADD VALUE IF NOT EXISTS 'voided';

-- Void remittance
UPDATE per_capita_remittances
SET 
  status = 'voided',
  notes = CONCAT(notes, ' | VOIDED: ', 'Reason for void'),
  updated_at = NOW()
WHERE id = 'rem-123';
```

Voided remittances:
- Remain in database for audit trail
- Excluded from totals and exports
- Visible in admin history views

---

## Technical Reference

### Database Schema

**Main Tables:**

```sql
-- Organizations (local unions, parent orgs, CLC)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  clc_affiliate_code VARCHAR(50) UNIQUE,
  type organization_type NOT NULL,
  parent_organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Per-capita remittances
CREATE TABLE per_capita_remittances (
  id UUID PRIMARY KEY,
  remittance_month INTEGER NOT NULL CHECK (remittance_month BETWEEN 1 AND 12),
  remittance_year INTEGER NOT NULL,
  from_organization_id UUID NOT NULL REFERENCES organizations(id),
  to_organization_id UUID NOT NULL REFERENCES organizations(id),
  total_members INTEGER NOT NULL CHECK (total_members >= 0),
  good_standing_members INTEGER NOT NULL CHECK (good_standing_members >= 0),
  remittable_members INTEGER NOT NULL CHECK (remittable_members >= 0),
  per_capita_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status remittance_status NOT NULL DEFAULT 'pending',
  submitted_date TIMESTAMP,
  paid_date TIMESTAMP,
  clc_account_code VARCHAR(20) NOT NULL,
  gl_account VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_member_hierarchy 
    CHECK (remittable_members <= good_standing_members AND good_standing_members <= total_members),
  CONSTRAINT valid_dates
    CHECK (submitted_date IS NULL OR paid_date IS NULL OR paid_date >= submitted_date)
);

-- Chart of accounts
CREATE TABLE chart_of_accounts (
  code VARCHAR(20) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type account_type NOT NULL,
  statcan_category VARCHAR(10),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  parent_code VARCHAR(20) REFERENCES chart_of_accounts(code),
  gl_account VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Per-capita rates
CREATE TABLE per_capita_rates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  effective_date DATE NOT NULL,
  rate_amount DECIMAL(10,2) NOT NULL,
  rate_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Enums:**

```sql
CREATE TYPE organization_type AS ENUM (
  'local_union',
  'regional_council',
  'provincial_federation',
  'national_union',
  'national_federation'
);

CREATE TYPE remittance_status AS ENUM (
  'pending',
  'submitted',
  'paid',
  'overdue',
  'voided'
);

CREATE TYPE account_type AS ENUM (
  'Revenue',
  'Expense',
  'Asset',
  'Liability',
  'Equity'
);
```

---

### API Endpoints

**Base URL**: `/api/admin/clc/remittances`

#### GET `/api/admin/clc/remittances`
List remittances with filters

**Query Parameters:**
- `status` (optional): 'pending' | 'submitted' | 'paid' | 'overdue'
- `month` (optional): 1-12
- `year` (optional): 4-digit year
- `organizationId` (optional): UUID
- `dueDateFrom` (optional): ISO date string
- `dueDateTo` (optional): ISO date string
- `page` (optional): Page number (default 1)
- `pageSize` (optional): Results per page (default 50)

**Response:**
```json
{
  "remittances": [
    {
      "id": "rem-123",
      "remittanceMonth": 12,
      "remittanceYear": 2024,
      "fromOrganizationId": "org-123",
      "toOrganizationId": "clc-parent",
      "totalMembers": 500,
      "goodStandingMembers": 480,
      "remittableMembers": 480,
      "perCapitaRate": "5.00",
      "totalAmount": "2400.00",
      "dueDate": "2025-01-31T00:00:00.000Z",
      "status": "pending",
      "fromOrganization": {
        "id": "org-123",
        "name": "Local 456",
        "slug": "local-456",
        "clcAffiliateCode": "CLC-456"
      },
      "toOrganization": {
        "id": "clc-parent",
        "name": "Canadian Labour Congress",
        "slug": "clc-national",
        "clcAffiliateCode": "CLC-NATIONAL"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalCount": 150,
    "totalPages": 3
  }
}
```

---

#### POST `/api/admin/clc/remittances`
Calculate remittances

**Request Body:**
```json
{
  "organizationId": "org-123",  // Optional: single org or omit for all orgs
  "month": 12,
  "year": 2024,
  "saveResults": true  // Optional: save to DB (default false)
}
```

**Response:**
```json
{
  "calculations": [
    {
      "organizationId": "org-123",
      "organizationName": "Local 456",
      "totalMembers": 500,
      "goodStandingMembers": 480,
      "remittableMembers": 480,
      "perCapitaRate": "5.00",
      "totalAmount": "2400.00",
      "dueDate": "2025-01-31"
    }
  ],
  "saveResult": {
    "success": true,
    "savedCount": 1
  },
  "message": "Calculated 1 remittance(s)"
}
```

---

#### GET `/api/admin/clc/remittances/[id]/export`
Export single remittance

**Query Parameters:**
- `format`: 'csv' | 'xml' | 'edi' | 'statcan' (default 'csv')

**Response Headers:**
- `Content-Type`: text/csv | application/xml | text/plain
- `Content-Disposition`: attachment; filename="clc-remittance-123-12-2024.csv"

**Response Body:** File content (CSV, XML, or StatCan text)

---

#### POST `/api/admin/clc/remittances/[id]/submit`
Submit remittance for payment

**Request Body:**
```json
{
  "notes": "Submitted via dashboard",
  "status": "submitted"  // Optional: 'paid' to mark as paid immediately
}
```

**Response:**
```json
{
  "success": true,
  "remittance": {
    "id": "rem-123",
    "status": "submitted",
    "submittedDate": "2025-01-10T14:30:00.000Z"
  }
}
```

---

#### GET `/api/admin/clc/remittances/export`
Batch export multiple remittances

**Query Parameters:**
- `format`: 'csv' | 'xml' | 'statcan' (default 'csv')
- `status` (optional): Filter by status
- `month` (optional): Filter by month
- `year` (optional): Filter by year
- `organizationId` (optional): Filter by org
- `remittanceIds` (optional): Comma-separated UUIDs (overrides filters)

**Response:** File download with batch content

---

### Cron Schedule

**Path**: `/api/cron/monthly-per-capita`

**Schedule**: `0 0 1 * *` (1st of month at midnight)

**Process:**
1. Query all active local unions with parent organizations
2. For each org:
   - Count members in good standing
   - Get current per-capita rate
   - Calculate remittance
   - Save to database
3. Log success/failure for each org
4. Send admin notification with summary

**Manual Trigger:**
```bash
GET /api/cron/monthly-per-capita?CRON_SECRET=<secret>
```

**Environment Variable:**
```env
CRON_SECRET=your_secret_key_here
```

---

### File Formats

#### CSV Format

**Headers:**
```
Organization,Period,Total Members,Good Standing Members,Remittable Members,Per-Capita Rate,Total Amount,Due Date,Status,CLC Affiliate Code
```

**Example Row:**
```
Local 456,Dec 2024,500,480,480,$5.00,$2400.00,Jan 31 2025,Pending,CLC-456
```

---

#### XML/EDI Format

**Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CLCRemittanceFile>
  <Remittance id="rem-123">
    <Header>
      <Period month="12" year="2024" />
      <FromOrganization code="CLC-456">Local 456</FromOrganization>
      <ToOrganization code="CLC-NATIONAL">Canadian Labour Congress</ToOrganization>
      <DueDate>2025-01-31</DueDate>
    </Header>
    <Lines>
      <Line>
        <MemberCount type="total">500</MemberCount>
        <MemberCount type="goodStanding">480</MemberCount>
        <MemberCount type="remittable">480</MemberCount>
        <PerCapitaRate>5.00</PerCapitaRate>
        <LineAmount>2400.00</LineAmount>
      </Line>
    </Lines>
    <Summary>
      <TotalRemittableMembers>480</TotalRemittableMembers>
      <TotalAmount currency="CAD">2400.00</TotalAmount>
      <Status>pending</Status>
    </Summary>
  </Remittance>
</CLCRemittanceFile>
```

---

#### StatCan LAB-05302 Format

**Plain Text Sections:**
```
=== ORGANIZATION INFO ===
Organization Name: Local 456
CLC Affiliate Code: CLC-456
Union Type: Local Union
Parent Organization: Canadian Labour Congress

=== REPORTING PERIOD ===
Fiscal Year: 2024
Report Type: Annual Per-Capita Summary

=== FINANCIAL SUMMARY ===
Category 030 - Per-Capita Taxes: $28,800.00

=== MEMBER COUNTS ===
Total Members: 500
Good Standing Members: 480
Remittable Members: 480
Average Monthly Members: 480
```

**StatCan Categories:**
- `010`: Membership Dues
- `020`: Initiation Fees
- `030`: Per-Capita Taxes ← **Remittances go here**
- `040`: Special Assessments
- `050`: Salaries & Wages
- `060`: Legal & Professional Fees
- `070`: Office & Administration
- `080`: Other Operating Expenses

---

## Support

For technical support or questions:
- **Email**: support@unionclaims.ca
- **Documentation**: https://docs.unionclaims.ca
- **Issue Tracker**: https://github.com/union-claims/issues

For CLC-specific questions:
- **CLC Finance Department**: finance@clcctc.ca
- **CLC Affiliate Support**: affiliates@clcctc.ca

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Union Claims Development Team
