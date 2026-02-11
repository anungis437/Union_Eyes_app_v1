# Developer Integration Guide - Jurisdiction Framework

## Introduction

This guide is for **developers** who need to integrate the jurisdiction framework into new modules, pages, or features. The framework provides comprehensive support for **14 Canadian jurisdictions** with automatic deadline calculations, jurisdiction-specific rules, and bilingual support.

**Target Audience:** Full-stack developers, frontend engineers, backend API developers  
**Prerequisites:** Familiarity with Next.js, React, TypeScript, PostgreSQL, Drizzle ORM

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Integration Examples](#component-integration-examples)
3. [API Endpoint Usage](#api-endpoint-usage)
4. [Helper Function Patterns](#helper-function-patterns)
5. [Database Schema](#database-schema)
6. [Testing New Integrations](#testing-new-integrations)
7. [Common Patterns](#common-patterns)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Layered Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Presentation Layer (React Components)              â”‚
â”‚  - JurisdictionBadge, JurisdictionSelector         â”‚
â”‚  - ClaimJurisdictionInfo, StrikeVoteJurisdiction... â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Business Logic Layer (Helper Functions)            â”‚
â”‚  - getTenantJurisdiction(), getJurisdictionDeadline()â”‚
â”‚  - calculateBusinessDaysDeadline()                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  API Layer (REST Endpoints)                         â”‚
â”‚  - GET /api/jurisdiction/list                       â”‚
â”‚  - GET /api/jurisdiction/rules                      â”‚
â”‚  - POST /api/jurisdiction/calculate-deadline        â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                  â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Data Layer (PostgreSQL via Drizzle ORM)            â”‚
â”‚  - jurisdiction_rules, jurisdiction_deadlines       â”‚
â”‚  - jurisdiction_holidays, jurisdiction_requirement..â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Key Files

| File Path | Purpose |
|-----------|---------|
| `lib/jurisdiction-helpers.ts` | Helper functions (getTenantJurisdiction, getDeadlineUrgency, etc.) |
| `components/jurisdiction/jurisdiction-badge.tsx` | Badge component (Federal, Ontario, etc.) |
| `components/jurisdiction/jurisdiction-selector.tsx` | Dropdown selector with search |
| `components/jurisdiction/deadline-calculator.tsx` | Interactive deadline calculator modal |
| `components/claims/claim-jurisdiction-info.tsx` | Claims module integration example |
| `app/api/jurisdiction/list/route.ts` | API: List all 14 jurisdictions |
| `app/api/jurisdiction/rules/route.ts` | API: Get rules by jurisdiction/category |
| `app/api/jurisdiction/calculate-deadline/route.ts` | API: Calculate deadline with holidays |
| `db/schema/jurisdiction.ts` | Database schema (4 tables, 5 enums) |

---

## Component Integration Examples

### Example 1: Adding Jurisdiction to a New Workflow Page

**Scenario:** You're building a new "Unfair Labour Practice" module and need to show jurisdiction-specific filing deadlines.

**Step 1: Import Components**

```tsx
// app/[locale]/ulp/[ulpId]/page.tsx
import { ClaimJurisdictionInfo } from '@/components/claims/claim-jurisdiction-info';
import { JurisdictionBadge } from '@/components/jurisdiction/jurisdiction-badge';
```

**Step 2: Fetch ULP Data**

```tsx
async function getULPData(ulpId: string) {
  // Fetch ULP from database
  const ulp = await db.query.unfairLabourPractices.findFirst({
    where: eq(unfairLabourPractices.id, ulpId),
  });
  
  return ulp;
}
```

**Step 3: Render Jurisdiction Components**

```tsx
export default async function ULPDetailPage({ 
  params 
}: { 
  params: { ulpId: string; locale: string } 
}) {
  const ulp = await getULPData(params.ulpId);
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">ULP #{ulp.id}</h1>
        <JurisdictionBadge 
          jurisdiction={ulp.jurisdiction as CAJurisdiction}
          showBilingual={true}
        />
      </div>
      
      {/* Jurisdiction Info Card */}
      <ClaimJurisdictionInfo
        claimId={ulp.id}
        tenantId={ulp.tenantId}
        claimCategory="unfair_labour_practice"
        incidentDate={ulp.incidentDate}
      />
      
      {/* Rest of ULP details */}
      <div className="mt-6">
        <h2>Details</h2>
        <p>{ulp.description}</p>
      </div>
    </div>
  );
}
```

**Result:** The page now displays:

- Jurisdiction badge (e.g., "ðŸ‡¨ðŸ‡¦ Federal EN/FR")
- Filing deadline calculation (e.g., "25 business days â†’ February 19, 2025")
- Urgency indicator (red/orange/yellow/green)
- Interactive deadline calculator button
- Legal references (e.g., "Canada Labour Code Â§240")

---

### Example 2: Creating a Custom Module-Specific Component

**Scenario:** You need a jurisdiction component for a new "Lockout" module with lockout notice requirements.

**Step 1: Create Component File**

```tsx
// components/lockout/lockout-jurisdiction-info.tsx
'use client';

import { useEffect, useState } from 'react';
import { JurisdictionBadge } from '@/components/jurisdiction/jurisdiction-badge';
import { DeadlineCalculator } from '@/components/jurisdiction/deadline-calculator';
import { getTenantJurisdiction, getDeadlineUrgency } from '@/lib/jurisdiction-helpers';
import type { CAJurisdiction } from '@/types/jurisdiction';

interface LockoutJurisdictionInfoProps {
  lockoutId: string;
  tenantId: string;
  lockoutNoticeDate: Date;
}

export function LockoutJurisdictionInfo({
  lockoutId,
  tenantId,
  lockoutNoticeDate,
}: LockoutJurisdictionInfoProps) {
  const [jurisdiction, setJurisdiction] = useState<CAJurisdiction | null>(null);
  const [noticeHours, setNoticeHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJurisdiction() {
      try {
        // Get tenant's jurisdiction
        const j = await getTenantJurisdiction(tenantId);
        setJurisdiction(j);

        // Fetch lockout notice requirements for this jurisdiction
        const response = await fetch(
          `/api/jurisdiction/rules?jurisdiction=${j}&category=lockout_notice`
        );
        const data = await response.json();
        
        if (data.rules && data.rules.length > 0) {
          setNoticeHours(data.rules[0].noticeHours || 48);
        }
      } catch (error) {
} finally {
        setLoading(false);
      }
    }

    loadJurisdiction();
  }, [tenantId]);

  if (loading) {
    return <div>Loading jurisdiction information...</div>;
  }

  if (!jurisdiction) {
    return null;
  }

  // Calculate when lockout can commence
  const noticeDeadline = new Date(lockoutNoticeDate);
  noticeDeadline.setHours(noticeDeadline.getHours() + noticeHours);

  const now = new Date();
  const hoursRemaining = Math.ceil((noticeDeadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  const urgency = hoursRemaining < 0 ? 'critical' : 
                  hoursRemaining < 24 ? 'high' : 
                  hoursRemaining < 48 ? 'medium' : 'low';

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Lockout Notice Requirements</h3>
        <JurisdictionBadge jurisdiction={jurisdiction} showBilingual={true} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Notice Given</p>
          <p className="text-lg font-medium">
            {lockoutNoticeDate.toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Required Notice Period</p>
          <p className="text-lg font-medium">{noticeHours} hours</p>
        </div>
      </div>

      <div className={`mt-4 p-4 rounded-lg ${
        urgency === 'critical' ? 'bg-red-50 border-l-4 border-red-500' :
        urgency === 'high' ? 'bg-orange-50 border-l-4 border-orange-500' :
        urgency === 'medium' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
        'bg-green-50 border-l-4 border-green-500'
      }`}>
        <p className="font-medium">
          {hoursRemaining < 0 ? 'Lockout Can Commence Now' : 
           `Lockout Can Commence In: ${hoursRemaining} hours`}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Earliest Lockout Date: {noticeDeadline.toLocaleString()}
        </p>
      </div>

      <div className="mt-4">
        <DeadlineCalculator
          jurisdiction={jurisdiction}
          category="lockout_notice"
          startDate={lockoutNoticeDate}
        />
      </div>
    </div>
  );
}
```

**Step 2: Use in Lockout Page**

```tsx
// app/[locale]/lockout/[lockoutId]/page.tsx
import { LockoutJurisdictionInfo } from '@/components/lockout/lockout-jurisdiction-info';

export default async function LockoutPage({ params }: { params: { lockoutId: string } }) {
  const lockout = await getLockoutData(params.lockoutId);
  
  return (
    <div>
      <h1>Lockout #{lockout.id}</h1>
      <LockoutJurisdictionInfo
        lockoutId={lockout.id}
        tenantId={lockout.tenantId}
        lockoutNoticeDate={lockout.noticeDate}
      />
    </div>
  );
}
```

---

## API Endpoint Usage

### Example 1: List All Jurisdictions

**Endpoint:** `GET /api/jurisdiction/list`

**Usage:**

```typescript
// Fetch all 14 jurisdictions
const response = await fetch('/api/jurisdiction/list');
const data = await response.json();
// [
//   { code: 'CA-FED', name: 'Federal', bilingual: true },
//   { code: 'CA-AB', name: 'Alberta', bilingual: false },
//   ...
// ]
```

**Response Schema:**

```typescript
{
  jurisdictions: Array<{
    code: CAJurisdiction;
    name: string;
    bilingual: boolean;
  }>;
  count: number;
}
```

---

### Example 2: Get Jurisdiction Rules

**Endpoint:** `GET /api/jurisdiction/rules?jurisdiction={code}&category={category}`

**Usage:**

```typescript
// Get Federal grievance filing rules
const response = await fetch(
  '/api/jurisdiction/rules?jurisdiction=CA-FED&category=grievance_filing'
);
const data = await response.json();
// {
//   deadlineDays: 25,
//   dayType: 'business',
//   legalReference: 'Canada Labour Code Â§240',
//   description: 'Grievance must be filed within 25 business days...'
// }
```

**Query Parameters:**

- `jurisdiction` (required): CAJurisdiction code (e.g., "CA-FED", "CA-ON")
- `category` (required): Rule category (see enum below)

**Rule Categories:**

```typescript
type RuleCategory =
  | 'grievance_filing'
  | 'arbitration_filing'
  | 'strike_vote'
  | 'strike_notice'
  | 'certification'
  | 'lockout_notice'
  | 'collective_bargaining'
  | 'cooling_off'
  | 'essential_services';
```

---

### Example 3: Calculate Deadline with Holidays

**Endpoint:** `POST /api/jurisdiction/calculate-deadline`

**Usage:**

```typescript
// Calculate Federal grievance deadline from Jan 15, 2025
const response = await fetch('/api/jurisdiction/calculate-deadline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jurisdiction: 'CA-FED',
    startDate: '2025-01-15',
    businessDays: 25,
  }),
});

const data = await response.json();
// {
//   deadline: '2025-02-19',
//   businessDays: 25,
//   holidaysExcluded: [],
//   weekendsExcluded: 10,
//   legalReference: 'Canada Labour Code Â§240'
// }
```

**Request Body:**

```typescript
{
  jurisdiction: CAJurisdiction;
  startDate: string; // ISO format YYYY-MM-DD
  businessDays: number;
}
```

**Response Schema:**

```typescript
{
  deadline: string; // ISO format YYYY-MM-DD
  businessDays: number;
  holidaysExcluded: Array<{
    date: string;
    name: string;
  }>;
  weekendsExcluded: number;
  legalReference: string;
}
```

---

### Example 4: Business Days Operations

**Endpoint:** `POST /api/jurisdiction/business-days`

**Usage - Add Days:**

```typescript
// Add 25 business days to Jan 15, 2025 (Federal jurisdiction)
const response = await fetch('/api/jurisdiction/business-days', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jurisdiction: 'CA-FED',
    startDate: '2025-01-15',
    operation: 'add',
    days: 25,
  }),
});

const data = await response.json();
// "2025-02-19"
```

**Usage - Count Days:**

```typescript
// Count business days between Jan 15 - Feb 19, 2025
const response = await fetch('/api/jurisdiction/business-days', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jurisdiction: 'CA-FED',
    startDate: '2025-01-15',
    endDate: '2025-02-19',
    operation: 'count',
  }),
});

const data = await response.json();
// 25
```

**Operations:**

- `add`: Add business days to start date â†’ returns `resultDate`
- `subtract`: Subtract business days from start date â†’ returns `resultDate`
- `count`: Count business days between start and end â†’ returns `businessDays`

---

### Example 5: Get Holidays

**Endpoint:** `GET /api/jurisdiction/holidays?jurisdiction={code}&year={year}`

**Usage:**

```typescript
// Get Federal holidays for 2025
const response = await fetch('/api/jurisdiction/holidays?jurisdiction=CA-FED&year=2025');
const data = await response.json();
// [
//   { date: '2025-01-01', name: "New Year's Day", isProvincial: false },
//   { date: '2025-07-01', name: 'Canada Day', isProvincial: false },
//   ...
// ]
```

**Optional Query Parameters:**

- `startDate`: Filter holidays >= this date (ISO format)
- `endDate`: Filter holidays <= this date (ISO format)

---

## Helper Function Patterns

### Pattern 1: Get Tenant's Jurisdiction

```typescript
import { getTenantJurisdiction } from '@/lib/jurisdiction-helpers';

async function myFunction(tenantId: string) {
  const jurisdiction = await getTenantJurisdiction(tenantId);
  
  if (!jurisdiction) {
return;
  }
}
```

**Returns:** `CAJurisdiction` or `null`

---

### Pattern 2: Calculate Deadline Urgency

```typescript
import { getDeadlineUrgency } from '@/lib/jurisdiction-helpers';

function displayDeadlineAlert(daysRemaining: number) {
  const urgency = getDeadlineUrgency(daysRemaining);
  
  // urgency: { level: 'critical' | 'high' | 'medium' | 'low', color: string, label: string }
  
  return (
    <div className={`alert bg-${urgency.color}-50 border-${urgency.color}-500`}>
      <span className="font-bold">{urgency.label}</span>
      <span>{daysRemaining} days remaining</span>
    </div>
  );
}
```

**Returns:**

```typescript
{
  level: 'critical' | 'high' | 'medium' | 'low';
  color: 'red' | 'orange' | 'yellow' | 'green';
  label: 'Overdue' | 'Critical' | 'Urgent' | 'Upcoming' | 'On Track';
}
```

---

### Pattern 3: Check Bilingual Requirement

```typescript
import { requiresBilingualSupport } from '@/lib/jurisdiction-helpers';

function MyComponent({ jurisdiction }: { jurisdiction: CAJurisdiction }) {
  const isBilingual = requiresBilingualSupport(jurisdiction);
  
  return (
    <div>
      <h3>Document Requirements</h3>
      {isBilingual && (
        <p className="text-amber-600">
          ðŸŒ This jurisdiction requires bilingual (EN/FR) documentation
        </p>
      )}
    </div>
  );
}
```

**Returns:** `boolean` (true for CA-FED, CA-QC, CA-NB)

---

### Pattern 4: Get Jurisdiction Display Name

```typescript
import { getJurisdictionName } from '@/lib/jurisdiction-helpers';

function displayJurisdiction(code: CAJurisdiction) {
  const name = getJurisdictionName(code);
// "CA-FED" â†’ "Federal"
  // "CA-ON" â†’ "Ontario"
}
```

---

## Database Schema

### Key Tables

```typescript
// db/schema/jurisdiction.ts

// 1. jurisdiction_rules: Core rules (deadline days, thresholds, etc.)
export const jurisdictionRules = pgTable('jurisdiction_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdiction: jurisdictionEnum('jurisdiction').notNull(),
  category: ruleCategoryEnum('category').notNull(),
  deadlineDays: integer('deadline_days'),
  dayType: dayTypeEnum('day_type').default('business'),
  thresholdPercentage: numeric('threshold_percentage'),
  legalReference: text('legal_reference'),
  description: text('description'),
});

// 2. jurisdiction_holidays: Statutory holidays by jurisdiction/year
export const jurisdictionHolidays = pgTable('jurisdiction_holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdiction: jurisdictionEnum('jurisdiction').notNull(),
  holidayDate: date('holiday_date').notNull(),
  holidayName: varchar('holiday_name', { length: 255 }).notNull(),
  isProvincial: boolean('is_provincial').default(false),
  year: integer('year').notNull(),
});

// 3. jurisdiction_deadlines: Calculated deadlines for specific claims/workflows
export const jurisdictionDeadlines = pgTable('jurisdiction_deadlines', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdiction: jurisdictionEnum('jurisdiction').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'claim', 'grievance', etc.
  entityId: uuid('entity_id').notNull(),
  startDate: date('start_date').notNull(),
  deadlineDate: date('deadline_date').notNull(),
  businessDays: integer('business_days').notNull(),
  holidaysExcluded: json('holidays_excluded').$type<string[]>(),
});

// 4. jurisdiction_requirement_templates: Bilingual document templates
export const jurisdictionRequirementTemplates = pgTable('jurisdiction_requirement_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdiction: jurisdictionEnum('jurisdiction').notNull(),
  category: ruleCategoryEnum('category').notNull(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  templateContentEn: text('template_content_en'),
  templateContentFr: text('template_content_fr'),
});
```

### Enums

```typescript
export const jurisdictionEnum = pgEnum('ca_jurisdiction', [
  'CA-FED', 'CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL',
  'CA-NT', 'CA-NS', 'CA-NU', 'CA-ON', 'CA-PE', 'CA-QC',
  'CA-SK', 'CA-YT',
]);

export const ruleCategoryEnum = pgEnum('rule_category', [
  'grievance_filing', 'arbitration_filing', 'strike_vote',
  'strike_notice', 'certification', 'lockout_notice',
  'collective_bargaining', 'cooling_off', 'essential_services',
]);

export const dayTypeEnum = pgEnum('day_type', ['business', 'calendar']);
```

---

## Testing New Integrations

### Unit Tests with Vitest

**Example: Test Custom Helper Function**

```typescript
// __tests__/lib/my-custom-helpers.test.ts
import { describe, it, expect } from 'vitest';
import { myCustomFunction } from '@/lib/my-custom-helpers';

describe('myCustomFunction', () => {
  it('should calculate deadline correctly', () => {
    const result = myCustomFunction('CA-FED', new Date('2025-01-15'), 25);
    expect(result).toEqual(new Date('2025-02-19'));
  });
});
```

---

### Component Tests with React Testing Library

**Example: Test Custom Jurisdiction Component**

```typescript
// __tests__/components/lockout/lockout-jurisdiction-info.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LockoutJurisdictionInfo } from '@/components/lockout/lockout-jurisdiction-info';

// Mock jurisdiction helpers
vi.mock('@/lib/jurisdiction-helpers', () => ({
  getTenantJurisdiction: vi.fn().mockResolvedValue('CA-FED'),
}));

// Mock fetch API
global.fetch = vi.fn().mockResolvedValue({
  json: async () => ({
    rules: [{ noticeHours: 72, legalReference: 'CLC Â§87.2' }],
  }),
});

describe('LockoutJurisdictionInfo', () => {
  it('should render lockout notice requirements', async () => {
    render(
      <LockoutJurisdictionInfo
        lockoutId="123"
        tenantId="tenant-1"
        lockoutNoticeDate={new Date('2025-01-15')}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Lockout Notice Requirements')).toBeInTheDocument();
      expect(screen.getByText('72 hours')).toBeInTheDocument();
    });
  });
});
```

---

## Common Patterns

### Pattern 1: Jurisdiction-Aware Form Validation

```typescript
// Validate strike vote threshold based on jurisdiction
function validateStrikeVote(
  jurisdiction: CAJurisdiction,
  votesInFavor: number,
  totalVotesCast: number,
  totalEligibleMembers: number
): { valid: boolean; message: string } {
  if (jurisdiction === 'CA-MB') {
    // Manitoba: 65% of votes cast
    const percentage = (votesInFavor / totalVotesCast) * 100;
    if (percentage >= 65) {
      return { valid: true, message: 'Strike vote passed (65% threshold)' };
    }
    return { valid: false, message: `Strike vote failed (${percentage.toFixed(1)}% < 65%)` };
  } else if (jurisdiction === 'CA-SK') {
    // Saskatchewan: 45% of all eligible members
    const percentage = (votesInFavor / totalEligibleMembers) * 100;
    if (percentage >= 45) {
      return { valid: true, message: 'Strike vote passed (45% of eligible members)' };
    }
    return { valid: false, message: `Strike vote failed (${percentage.toFixed(1)}% < 45%)` };
  } else {
    // Standard: 50%+1 of votes cast
    if (votesInFavor > totalVotesCast / 2) {
      return { valid: true, message: 'Strike vote passed (simple majority)' };
    }
    return { valid: false, message: 'Strike vote failed (simple majority required)' };
  }
}
```

---

### Pattern 2: Dynamic Form Loading Based on Jurisdiction

```typescript
// Load correct certification form based on jurisdiction
async function getCertificationForm(jurisdiction: CAJurisdiction) {
  const formMapping = {
    'CA-FED': 'CIRB Form 1',
    'CA-AB': 'LRB-001',
    'CA-QC': 'TAT Application',
    'CA-ON': 'OLRB Form 1',
  };
  
  const formName = formMapping[jurisdiction] || 'Standard Certification Application';
  
  const response = await fetch(`/api/forms/${formName}`);
  return response.json();
}
```

---

## Best Practices

### âœ… DO

1. **Always handle null jurisdictions gracefully**

   ```typescript
   const jurisdiction = await getTenantJurisdiction(tenantId);
   if (!jurisdiction) {
     return <ErrorMessage>Jurisdiction not configured</ErrorMessage>;
   }
   ```

2. **Cache jurisdiction lookups per session**

   ```typescript
   // Use React Query or SWR for caching
   const { data: jurisdiction } = useQuery(['jurisdiction', tenantId], () =>
     getTenantJurisdiction(tenantId)
   );
   ```

3. **Implement loading and error states**

   ```typescript
   if (loading) return <LoadingSpinner />;
   if (error) return <ErrorMessage error={error} />;
   ```

4. **Use TypeScript types for jurisdiction codes**

   ```typescript
   // âœ… Type-safe
   const jurisdiction: CAJurisdiction = 'CA-FED';
   
   // âŒ Avoid magic strings
   const jurisdiction = 'federal'; // Wrong format
   ```

---

### âŒ DON'T

1. **Don't hardcode jurisdiction logic**

   ```typescript
   // âŒ Bad
   if (jurisdiction === 'CA-FED') {
     return 25;
   } else if (jurisdiction === 'CA-ON') {
     return 30;
   }
   
   // âœ… Good
   const rules = await fetch(`/api/jurisdiction/rules?jurisdiction=${jurisdiction}&category=grievance_filing`);
   return rules.deadlineDays;
   ```

2. **Don't calculate deadlines manually**

   ```typescript
   // âŒ Bad
   const deadline = new Date(startDate);
   deadline.setDate(deadline.getDate() + 25);
   
   // âœ… Good
   const response = await fetch('/api/jurisdiction/calculate-deadline', {
     method: 'POST',
     body: JSON.stringify({ jurisdiction, startDate, businessDays: 25 }),
   });
   ```

3. **Don't forget error handling**

   ```typescript
   // âŒ Bad
   const data = await fetch('/api/jurisdiction/rules').then(r => r.json());
   
   // âœ… Good
   try {
     const response = await fetch('/api/jurisdiction/rules');
     if (!response.ok) throw new Error('Failed to fetch rules');
     const data = await response.json();
   } catch (error) {
// Show user-friendly error message
   }
   ```

---

## Troubleshooting

### Issue 1: Jurisdiction Not Loading

**Symptom:** Component shows "Loading..." indefinitely

**Solution:**

```typescript
// Check tenant has jurisdiction configured in database
const tenant = await db.query.tenants.findFirst({
  where: eq(tenants.id, tenantId),
});
// Should be a valid CAJurisdiction code

// If null, set jurisdiction:
await db.update(tenants)
  .set({ jurisdiction: 'CA-ON' })
  .where(eq(tenants.id, tenantId));
```

---

### Issue 2: Deadline Calculation Incorrect

**Symptom:** Calculated deadline doesn't match expected date

**Common Causes:**

- Not excluding holidays correctly
- Using calendar days instead of business days
- Start date is a weekend (system auto-adjusts to Monday)

**Solution:**

```typescript
// Debug with detailed API response
const response = await fetch('/api/jurisdiction/calculate-deadline', {
  method: 'POST',
  body: JSON.stringify({
    jurisdiction: 'CA-FED',
    startDate: '2025-01-15',
    businessDays: 25,
  }),
});

const data = await response.json();
```

---

### Issue 3: Bilingual Support Not Showing

**Symptom:** Federal/Quebec/NB jurisdiction not showing "EN/FR" indicator

**Solution:**

```typescript
// Verify requiresBilingualSupport returns true
import { requiresBilingualSupport } from '@/lib/jurisdiction-helpers';
// Should be true
// Should be true
// Should be true

// If false, check jurisdiction code format (must be 'CA-FED', not 'federal')
```

---

## Additional Resources

- **[Jurisdiction Features Overview](../user-guides/jurisdiction-features-overview.md)**: User-facing feature guide
- **[All Jurisdictions Reference](../jurisdiction-reference/all-jurisdictions.md)**: Complete rule tables
- **[Special Rules Guide](../jurisdiction-reference/special-rules.md)**: MB, SK, QC special cases
- **API Documentation**: `/api/jurisdiction` endpoints (Swagger/OpenAPI coming soon)

---

## Questions or Support

For developer support:

- **GitHub Issues**: Report bugs or feature requests
- **Email**: <dev-support@unionclaims.ca>
- **Slack**: #jurisdiction-framework channel

---

**Last Updated:** November 24, 2025  
**Version:** 1.0.0
