# PR-5: Opinionated Workflow Rules

**Status:** âœ… Complete  
**Tests:** 53/53 passing  
**Principle:** "Encode best practices as enforced rules, not suggestions"

## Overview

PR-5 transforms tribal knowledge of union grievance workflows into enforced business logic. Instead of relying on training and discipline, the system prevents invalid workflow transitions and automatically tracks SLA compliance.

**Key Achievement:** Union best practices are now code, not documentation.

## What We Built

### 1. Case Workflow FSM (`lib/services/case-workflow-fsm.ts`)

A finite state machine enforcing union grievance workflow progression.

#### 10 Case States

```
draft â†’ submitted â†’ acknowledged â†’ investigating â†’ pending_response 
  â†“                      â†“               â†“              â†“
  â””â”€â”€ withdrawn â†â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                         â†“
                                   negotiating â†’ resolved â†’ closed
                                         â†“
                                    escalated â†’ (external arbitration)
```

**Terminal States:** `closed`, `resolved`, `escalated` (no further transitions)

#### State Definitions

| State | Description | Next Transitions | Required Role |
|-------|-------------|------------------|---------------|
| `draft` | Case being prepared | submitted, withdrawn | member, steward |
| `submitted` | Case submitted for review | acknowledged, withdrawn | officer, steward, admin |
| `acknowledged` | Receipt confirmed | investigating, withdrawn, closed | officer, steward, admin |
| `investigating` | Gathering facts/evidence | pending_response, resolved, withdrawn, closed | officer, steward, admin |
| `pending_response` | Awaiting employer reply | negotiating, escalated, withdrawn, closed | officer, admin |
| `negotiating` | Active settlement discussions | resolved, escalated, withdrawn | officer, admin |
| `escalated` | Sent to external arbitration | (terminal) | officer, admin |
| `resolved` | Settlement reached | closed | officer, admin |
| `withdrawn` | Member withdrew case | closed | officer, admin |
| `closed` | Case permanently closed | (terminal) | officer, admin |

#### Validation Rules

**Role-Based Permissions:**

- Members can only draft and withdraw their own cases
- Stewards can acknowledge and investigate
- Officers can negotiate and escalate
- Admins have override capability (can close from any state)

**Conditional Requirements:**

- `investigating â†’ [any]`: Requires `hasSufficientEvidence: true`
  - **Admin Exception:** Admin can bypass this when closing (`investigating â†’ closed`)
- `pending_response â†’ negotiating`: Only officer/admin (not steward)

**SLA Enforcement:**

- `submitted â†’ acknowledged`: Must occur within 2 business days
  - Validated via `context.daysInCurrentState`
  - Transition rejected if SLA expired

#### Usage Example

```typescript
import { validateTransition, getAllowedTransitions } from '@/lib/services/case-workflow-fsm';

// Validate a state transition
const result = validateTransition('submitted', 'acknowledged', {
  actorRole: 'officer',
  daysInCurrentState: 1, // Within 2-day SLA
});

if (result.valid) {
  // Proceed with transition
  await updateCaseState(caseId, 'acknowledged');
} else {
}

// Get allowed next states
const nextStates = getAllowedTransitions('investigating');
// Returns: ['pending_response', 'resolved', 'withdrawn', 'closed']
```

### 2. SLA Calculator (`lib/services/sla-calculator.ts`)

Automated SLA tracking with early breach warning.

#### SLA Standards

| Standard | Requirement | Trigger Event | Completion Event |
|----------|-------------|---------------|------------------|
| Acknowledgment | 2 business days | `submitted` | `acknowledged` |
| First Response | 5 business days | `acknowledged` | `first_response` |
| Investigation | 15 business days | `acknowledged` | `investigation_complete` |

**Business Days:** Excludes weekends using `date-fns` library.

#### SLA Status Logic

- **within_sla:** < 80% of time elapsed
- **at_risk:** â‰¥ 80% of time elapsed (early warning)
- **breached:** â‰¥ 100% of time elapsed

**Example:** Investigation complete in 14 days

- 14 / 15 = 93% elapsed
- 93% â‰¥ 80% threshold â†’ **at_risk**

#### Usage Example

```typescript
import { calculateCaseSlaStatus, getAtRiskCases, SLA_STANDARDS } from '@/lib/services/sla-calculator';

// Calculate SLA status for a case
const timeline = [
  { timestamp: new Date('2025-01-01'), type: 'submitted' },
  { timestamp: new Date('2025-01-02'), type: 'acknowledged' },
  { timestamp: new Date('2025-01-08'), type: 'first_response' },
];

const assessment = calculateCaseSlaStatus('case-123', timeline, new Date('2025-01-15'));
// 'within_sla'
// 'within_sla'
// 'at_risk' (14 days = 93% of 15)
// ['investigation']

// Get all at-risk cases
const atRiskCases = await getAtRiskCases();
atRiskCases.forEach(c => {
});
```

## Integration Points

### API Route Integration

```typescript
// app/api/cases/[id]/transition/route.ts
import { validateTransition } from '@/lib/services/case-workflow-fsm';
import { calculateCaseSlaStatus } from '@/lib/services/sla-calculator';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { toState } = await request.json();
  const currentCase = await getCaseById(params.id);
  const user = await getCurrentUser();
  
  // Validate FSM transition
  const validation = validateTransition(currentCase.state, toState, {
    actorRole: user.role,
    daysInCurrentState: calculateDaysSince(currentCase.lastTransition),
    hasSufficientEvidence: currentCase.evidenceCount > 0,
  });
  
  if (!validation.valid) {
    return Response.json({ error: validation.message }, { status: 400 });
  }
  
  // Update state
  await updateCaseState(params.id, toState);
  
  // Calculate updated SLA status
  const timeline = await getCaseTimeline(params.id);
  const slaStatus = calculateCaseSlaStatus(params.id, timeline, new Date());
  
  return Response.json({ success: true, slaStatus });
}
```

### UI Dashboard Integration

```typescript
// components/case-list.tsx
import { calculateCaseSlaStatus } from '@/lib/services/sla-calculator';

export function CaseList({ cases }: { cases: Case[] }) {
  return (
    <div>
      {cases.map(c => {
        const sla = calculateCaseSlaStatus(c.id, c.timeline, new Date());
        const urgent = sla.criticalSlas.length > 0;
        
        return (
          <div key={c.id} className={urgent ? 'bg-red-50' : ''}>
            <h3>{c.title}</h3>
            <p>State: {c.state}</p>
            {urgent && (
              <div className="text-red-600">
                âš ï¸ SLA at risk: {sla.criticalSlas.join(', ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## Test Coverage

**53/53 tests passing** across both services.

### FSM Tests (`__tests__/services/case-workflow-fsm.test.ts`)

31 tests covering:

âœ… Valid state transitions  
âœ… Invalid transition rejection  
âœ… Role-based permission enforcement  
âœ… SLA expiration blocking  
âœ… Conditional requirements (evidence)  
âœ… Admin override capability  
âœ… Complete workflow paths (escalation, withdrawal)  
âœ… Terminal state detection  
âœ… Reopening prevention  
âœ… Urgent state identification

**Key Test Cases:**

- Member can only draft/withdraw
- Steward cannot negotiate (officer/admin only)
- Admin can close from any state (bypasses evidence requirement)
- Acknowledgment rejected after 2 days
- Investigation requires sufficient evidence (unless admin closing)

### SLA Tests (`__tests__/services/sla-calculator.test.ts`)

22 tests covering:

âœ… Acknowledgment SLA (2 days)  
âœ… First Response SLA (5 days)  
âœ… Investigation SLA (15 days)  
âœ… Business day calculations  
âœ… Weekend spanning  
âœ… At-risk threshold (80%)  
âœ… Breach detection  
âœ… Multiple simultaneous SLAs  
âœ… Case list filtering (at-risk, breached)

**Key Test Cases:**

- Acknowledgment at 1 day: within_sla
- Acknowledgment at 3 days: breached
- Investigation at 14 days: at_risk (93% elapsed)
- First response at 6 days: breached
- Weekend days excluded from calculations

## Business Value

### Before PR-5

- Workflow rules in training documents
- Manual SLA tracking in spreadsheets
- Inconsistent case progression
- Late breach detection
- Officers bypassing procedures

### After PR-5

- Workflow rules enforced by code
- Automated SLA tracking with early warning
- Guaranteed valid state transitions
- Proactive at-risk alerts (80% threshold)
- Admin override for exceptional cases

**Impact:** Union staff can focus on member advocacy instead of process policing.

## Acceptance Criteria

âœ… FSM enforces 10 case states with defined transitions  
âœ… Role-based permissions prevent unauthorized actions  
âœ… SLA validation blocks late acknowledgments  
âœ… Admin can override conditions when closing cases  
âœ… SLA calculator tracks 3 standards (acknowledge, response, investigation)  
âœ… At-risk warning triggers at 80% threshold  
âœ… Business day calculations exclude weekends  
âœ… 53/53 tests passing  
âœ… Integration examples documented  
âœ… No breaking changes to existing case API

## Next Steps

**PR-6: Defensibility Pack Exports**

- Generate system-of-record summaries
- Include complete audit trail
- Add integrity checksums
- Export member-visible + staff-visible timelines

This PR establishes the foundation for reliable case progression tracking, which PR-6 will package into defensible evidence exports.
