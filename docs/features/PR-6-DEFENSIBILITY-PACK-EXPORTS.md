# PR-6: Defensibility Pack Exports

**Status:** ✅ Complete  
**Tests:** 25/25 passing  
**Principle:** "One system. One truth. Defensible evidence."

## Overview

PR-6 transforms case data into arbitration-ready evidence exports. When a grievance goes to arbitration, union officers need system-of-record summaries with complete audit trails, timeline integrity, and SLA compliance documentation.

**Key Achievement:** Every case can be exported as a defensible evidence pack with cryptographic integrity verification.

## What We Built

### 1. Defensibility Pack Service (`lib/services/defensibility-pack.ts`)

A comprehensive export system generating arbitration-ready case summaries.

#### Core Components

**DefensibilityPack Structure:**

- **Metadata:** Export version, timestamp, generator, case ID
- **Case Summary:** Title, member info, current state, dates, type, priority
- **Dual-Surface Timeline:**
  - Member-visible (member + staff scopes)
  - Staff-visible (member + staff + admin scopes)
- **Audit Trail:** Complete log of all privileged actions
- **State Transitions:** Full workflow progression history with validation results
- **SLA Compliance:** Status for all three SLA standards
- **Integrity Verification:** SHA-256 hashes for tamper detection
- **Export Metadata:** Purpose, requester, format, sensitivity flag

#### Integrity Verification

All defensibility packs include cryptographic hashes:

```typescript
integrity: {
  timelineHash: "a1b2c3d4...",      // SHA-256 of staff timeline
  auditHash: "e5f6g7h8...",          // SHA-256 of audit trail
  stateTransitionHash: "i9j0k1l2...", // SHA-256 of state history
  combinedHash: "m3n4o5p6..."       // SHA-256 of all three hashes
}
```

**Tamper Detection:** Any modification to timeline, audit trail, or state transitions invalidates hashes. The `verifyPackIntegrity()` function recalculates and compares all hashes.

#### Visibility Scopes (Dual-Surface Enforcement)

**Member-Visible Timeline:**

- `member` scope: Status updates, communications
- `staff` scope: Investigation milestones, responses

**Staff-Visible Timeline:**

- All member-visible events
- `admin` scope: Internal strategy, officer notes
- Excludes `system` scope: Infrastructure logs

This implements "One system. Two surfaces. One truth."

#### Usage Examples

**Generate Arbitration Pack:**

```typescript
import { generateDefensibilityPack } from '@/lib/services/defensibility-pack';

// Retrieve case data
const timeline = await getCaseTimelineEvents(caseId);
const auditTrail = await getAuditTrail(caseId);
const stateTransitions = await getStateTransitionHistory(caseId);
const caseSummary = await getCaseSummary(caseId);

// Generate defensibility pack
const pack = await generateDefensibilityPack(
  caseId,
  timeline,
  auditTrail,
  stateTransitions,
  {
    purpose: 'arbitration',
    requestedBy: 'officer-456',
    exportFormat: 'json',
    includeSensitiveData: false, // Redact for external arbitration
    caseSummary,
    generatedBy: 'officer-456',
  }
);

// Export as JSON for electronic filing
const jsonExport = exportToJson(pack);
await saveFile(`case-${caseId}-arbitration.json`, jsonExport);

// Generate human-readable summary
const summary = generateArbitrationSummary(pack);
await saveFile(`case-${caseId}-summary.txt`, summary);
```

**Verify Pack Integrity:**

```typescript
import { verifyPackIntegrity } from '@/lib/services/defensibility-pack';

// Load previously exported pack
const pack = JSON.parse(await readFile('case-123-arbitration.json'));

// Verify integrity
const verification = verifyPackIntegrity(pack);

if (!verification.valid) {
  console.error('⚠️ Integrity check failed!');
  console.error('Failures:', verification.failures);
  // Output: ["Timeline integrity check failed"]
} else {
  console.log('✅ Pack integrity verified');
}
```

**Filter Timeline by Audience:**

```typescript
import { filterTimelineForAudience } from '@/lib/services/defensibility-pack';

const fullTimeline = await getCaseTimelineEvents(caseId);

// Member portal: show only member-visible events
const memberTimeline = filterTimelineForAudience(fullTimeline, 'member');

// Officer dashboard: show member + staff events
const staffTimeline = filterTimelineForAudience(fullTimeline, 'staff');

// Admin panel: show all events (except system)
const adminTimeline = filterTimelineForAudience(fullTimeline, 'admin');
```

### 2. Human-Readable Arbitration Summary

`generateArbitrationSummary()` produces text format suitable for arbitration submissions:

```
GRIEVANCE CASE SUMMARY
====================================================================================

Case ID: case-123
Title: Disciplinary action grievance
Member: Jane Doe
Type: disciplinary
Priority: high
Current State: investigating
Created: 2025-01-01T09:00:00.000Z
Last Updated: 2025-01-05T09:00:00.000Z

SLA COMPLIANCE
--------------------------------------------------------------------------------
Acknowledgment of Receipt: WITHIN_SLA (1 of 2 business days elapsed)
First Response to Member: WITHIN_SLA (3 of 5 business days elapsed)
Investigation Complete: AT_RISK (14 of 15 business days elapsed)

WORKFLOW PROGRESSION
--------------------------------------------------------------------------------
1. 2025-01-01T09:00:00.000Z: draft → submitted (member)
2. 2025-01-02T09:00:00.000Z: submitted → acknowledged (officer) - SLA compliant acknowledgment
3. 2025-01-03T09:00:00.000Z: acknowledged → investigating (officer)

MEMBER-VISIBLE TIMELINE
--------------------------------------------------------------------------------
1. 2025-01-01T09:00:00.000Z: Case submitted by member
2. 2025-01-02T09:00:00.000Z: Receipt acknowledged by officer
3. 2025-01-04T09:00:00.000Z: Initial response sent to member

INTEGRITY VERIFICATION
--------------------------------------------------------------------------------
Timeline Hash: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6...
Audit Hash: e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4...
Combined Hash: m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8i9j0k1l2...

EXPORT INFORMATION
--------------------------------------------------------------------------------
Generated: 2025-01-15T14:30:00.000Z
Generated By: officer-456
Purpose: arbitration
Export Version: 1.0.0
```

### 3. API Integration

**Export Endpoint:**

```typescript
// app/api/cases/[id]/export/route.ts
import { generateDefensibilityPack, exportToJson, generateArbitrationSummary } from '@/lib/services/defensibility-pack';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const { purpose, format } = await request.json();
  
  // Verify permissions (officer or admin only)
  if (!['officer', 'admin'].includes(user.role)) {
    return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  
  // Retrieve case data
  const timeline = await getCaseTimelineEvents(params.id);
  const auditTrail = await getAuditTrail(params.id);
  const stateTransitions = await getStateTransitionHistory(params.id);
  const caseSummary = await getCaseSummary(params.id);
  
  // Generate pack
  const pack = await generateDefensibilityPack(
    params.id,
    timeline,
    auditTrail,
    stateTransitions,
    {
      purpose,
      requestedBy: user.id,
      exportFormat: format,
      includeSensitiveData: purpose === 'compliance', // Only for internal compliance
      caseSummary,
      generatedBy: user.id,
    }
  );
  
  // Log export action
  await logPrivilegedAction(user.id, 'EXPORT_CASE', {
    caseId: params.id,
    purpose,
    format,
  });
  
  if (format === 'json') {
    return new Response(exportToJson(pack), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="case-${params.id}-${purpose}.json"`,
      },
    });
  } else {
    const summary = generateArbitrationSummary(pack);
    return new Response(summary, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="case-${params.id}-${purpose}.txt"`,
      },
    });
  }
}
```

## Test Coverage

**25/25 tests passing** across all defensibility pack functions.

### Test Categories

**generateDefensibilityPack (8 tests):**
✅ Complete pack generation with all components  
✅ Member-visible timeline filtering (member + staff scopes)  
✅ Staff-visible timeline filtering (all except system)  
✅ Complete audit trail inclusion  
✅ State transition history  
✅ SLA compliance calculation  
✅ Integrity hash generation (SHA-256)  
✅ Sensitive data flag respect

**verifyPackIntegrity (4 tests):**
✅ Unmodified pack verification passes  
✅ Timeline tampering detection  
✅ Audit trail tampering detection  
✅ State transition tampering detection

**generateArbitrationSummary (4 tests):**
✅ Human-readable summary generation  
✅ All SLA statuses included  
✅ State transitions with reasons  
✅ Integrity hashes in summary

**exportToJson (2 tests):**
✅ Formatted JSON export  
✅ Valid JSON structure

**filterTimelineForAudience (3 tests):**
✅ Member audience filtering (member scope only)  
✅ Staff audience filtering (member + staff scopes)  
✅ Admin audience filtering (all except system)

**Edge Cases (4 tests):**
✅ Empty timeline handling  
✅ Empty audit trail handling  
✅ No state transitions yet  
✅ Hash consistency across multiple exports

## Business Value

### Before PR-6

- Manual case summary preparation (hours of work)
- Inconsistent arbitration documentation
- No integrity verification
- Risk of incomplete evidence
- Manual timeline reconstruction

### After PR-6

- Automated defensibility pack generation (< 1 second)
- Standardized arbitration format
- Cryptographic integrity verification
- Complete evidence guarantee (audit trail + timeline + SLA)
- Dual-surface visibility enforcement

**Impact:** Union officers can generate arbitration-ready evidence with one click, with cryptographic proof of integrity.

## Security & Integrity

### Cryptographic Hashing

**SHA-256 (256-bit):** Industry-standard cryptographic hash function

- **Collision Resistance:** Virtually impossible to create two inputs with same hash
- **Tamper Evidence:** Any modification changes the hash
- **One-Way:** Cannot reverse hash to recover original data

### Integrity Verification Process

1. **Export Time:** Calculate hashes for timeline, audit trail, state transitions
2. **Combined Hash:** Hash of all three hashes (prevents partial tampering)
3. **Verification Time:** Recalculate all hashes and compare
4. **Result:** Pass (all match) or Fail (lists specific failures)

**Legal Defensibility:** Cryptographic hashes provide evidence that exported data has not been modified since generation.

### Visibility Scope Enforcement

**Member Requests:**

- Only `member` scope events visible
- No internal strategy or admin notes
- Protects union deliberation privilege

**Arbitration Exports:**

- Member + staff scopes visible
- Demonstrates union process and response
- Excludes internal strategy (admin scope)

**Compliance Audits:**

- All scopes visible (except system infrastructure)
- Complete transparency for regulatory review
- `includeSensitiveData: true` flag

## Export Purposes

| Purpose | Audience | Includes Sensitive | Use Case |
|---------|----------|-------------------|----------|
| `arbitration` | External arbitrator | ❌ No | External arbitration submission |
| `member_request` | Union member | ❌ No | Member FOI request |
| `audit` | Union leadership | ✅ Optional | Internal review |
| `compliance` | Regulators | ✅ Yes | Labor board investigation |

## Acceptance Criteria

✅ Generate defensibility pack with all components  
✅ Dual-surface timeline (member vs staff visibility)  
✅ Complete audit trail inclusion  
✅ State transition history with validation results  
✅ SLA compliance for all three standards  
✅ Cryptographic integrity hashes (SHA-256)  
✅ Tamper detection via hash verification  
✅ Human-readable arbitration summary  
✅ JSON export for electronic filing  
✅ Audience-specific timeline filtering  
✅ 25/25 tests passing  
✅ Handle edge cases (empty timeline, no transitions)  
✅ No breaking changes to existing case API

## Integration with Previous PRs

### PR-3: Evidence & Audit Baseline

- **Uses:** `AuditTrailService` for complete audit trail
- **Benefit:** Every privileged action captured in export

### PR-4: Visibility Scopes

- **Uses:** `visibility_scope` enum for timeline filtering
- **Benefit:** Dual-surface enforcement (member vs staff views)

### PR-5: Opinionated Workflow Rules

- **Uses:** `calculateCaseSlaStatus()` for SLA compliance
- **Benefit:** Automated SLA tracking in export

## Next Steps

**PR-7: LRO Signals API**

- Build real-time alert system for at-risk cases
- Webhook notifications for SLA breaches
- Dashboard widgets for urgent case list

**PR-8: Minimal UI Panel**

- Case list with urgency indicators
- One-click defensibility export
- Timeline viewer with dual-surface toggle

This PR establishes the foundation for arbitration-ready evidence exports with cryptographic integrity verification, enabling union officers to generate defensible case summaries with confidence.
