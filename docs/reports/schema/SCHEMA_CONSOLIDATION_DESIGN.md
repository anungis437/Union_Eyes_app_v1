# Schema Consolidation: Domain Design Document

**Status:** Phase 2 - Domain Structure Design  
**Date:** February 11, 2026  
**Estimated Completion:** 3 weeks

---

## Executive Summary

Consolidating **75 schema files** (20,198 LOC) into **13 domain-driven modules** to:
- Reduce import complexity (5→2 levels)
- Eliminate 18 duplicate definitions
- Remove 3 deprecated schemas
- Improve maintainability and type safety

---

## Analysis Results

### Current State Metrics
- **Total Files:** 75 schema files
- **Total Lines:** 20,198
- **Dependencies:** 121 cross-file imports
- **Circular Dependencies:** 0 ✅
- **Import Depth:** 5 levels (target: 2)
- **Duplicates:** 18 (8 tables, 5 enums, 5 types)

### Critical Issues
1. **Duplicate Tables:**
   - `clcSyncLog` (3 locations)
   - `clcWebhookLog` (3 locations)
   - `chartOfAccounts` (3 locations)
   - `grievanceDeadlines` (2 locations)
   - `rewardWalletLedger` (2 locations)

2. **Deprecated Schemas:**
   - `tenant-management-schema.ts` (replaced)
   - `organization-members-schema.ts` (commented out)
   - `ml-predictions-schema.ts` (merged into analytics)

3. **Hub Files (High Coupling):**
   - `profiles-schema.ts` (18 connections)
   - `user-management-schema.ts` (5 connections)
   - `shared-clause-library-schema.ts` (4 connections)

---

## Domain Architecture

### Design Principles
1. **Domain-Driven:** Group by business capability, not technical layer
2. **High Cohesion:** Related schemas stay together
3. **Low Coupling:** Minimize cross-domain dependencies
4. **Single Source:** One canonical definition per entity
5. **Backward Compatible:** Maintain existing exports during migration

### Domain Definitions

#### 1. **Member Domain** (`domains/member/`)
**Purpose:** Core member identity and user management  
**Files:** 4 schemas → 1 unified module  
**Lines:** ~800 LOC  
**Priority:** 1 (highest)

**Schemas:**
- `profiles-schema.ts` (most connected: 18 refs)
- `organization-members-schema.ts` (deprecated, to remove)
- `pending-profiles-schema.ts`
- `user-management-schema.ts`

**Primary Exports:**
- `profiles` table
- `pendingProfiles` table
- `userRoles` enum
- `MemberProfile` type

**Rationale:** Member identity is referenced throughout application. Consolidating reduces circular dependency risk.

---

#### 2. **Claims Domain** (`domains/claims/`)
**Purpose:** Grievances, claims, and legal deadlines  
**Files:** 4 schemas → 1 unified module  
**Lines:** ~900 LOC  
**Priority:** 2

**Schemas:**
- `claims-schema.ts`
- `grievance-schema.ts`
- `deadlines-schema.ts`
- `grievance-workflow-schema.ts` (727 lines - largest file)

**Duplicates to Resolve:**
- `grievanceDeadlines` (in 2 files)
- `GrievanceType` type (in 2 files)

**Primary Exports:**
- `claims` table
- `grievances` table
- `grievanceDeadlines` table (canonical)
- `grievanceWorkflows` table

---

#### 3. **Agreements Domain** (`domains/agreements/`)
**Purpose:** Collective bargaining agreements and clauses  
**Files:** 5 schemas → 1 unified module  
**Lines:** ~1,000 LOC  
**Priority:** 3

**Schemas:**
- `collective-agreements-schema.ts`
- `cba-schema.ts`
- `cba-clauses-schema.ts`
- `cba-intelligence-schema.ts`
- `shared-clause-library-schema.ts`

**Duplicates to Resolve:**
- `ClauseType` type (use cba-clauses-schema version)

**Primary Exports:**
- `collectiveAgreements` table
- `cbaArticles` table
- `cbaClausesLibrary` table
- `ClauseType` enum (canonical)

---

#### 4. **Finance Domain** (`domains/finance/`)
**Purpose:** Financial transactions, dues, and accounting  
**Files:** 6 schemas → 1 unified module  
**Lines:** ~900 LOC  
**Priority:** 4

**Schemas:**
- `dues-transactions-schema.ts`
- `autopay-settings-schema.ts`
- `financial-payments-schema.ts`
- `chart-of-accounts-schema.ts`
- `strike-fund-tax-schema.ts`
- `transfer-pricing-schema.ts`

**Duplicates to Resolve:**
- `chartOfAccounts` (in 3 files - use chart-of-accounts-schema)
- `glAccountMappings` (in 2 files)
- `accountTypeEnum` (in 2 files)

**Primary Exports:**
- `duesTransactions` table
- `chartOfAccounts` table (canonical)
- `strikeFundDistributions` table

---

#### 5. **Governance Domain** (`domains/governance/`)
**Purpose:** Organizational governance and voting  
**Files:** 3 schemas → 1 unified module  
**Lines:** ~600 LOC  
**Priority:** 5

**Schemas:**
- `governance-schema.ts`
- `founder-conflict-schema.ts`
- `voting-schema.ts`

**Primary Exports:**
- `governanceCommittees` table
- `founderConflicts` table
- `votes` table

---

#### 6. **Communications Domain** (`domains/communications/`)
**Purpose:** Member engagement and notifications  
**Files:** 7 schemas → 1 unified module  
**Lines:** ~1,200 LOC (largest domain)  
**Priority:** 6

**Schemas:**
- `messages-schema.ts`
- `notifications-schema.ts`
- `newsletter-schema.ts`
- `sms-communications-schema.ts`
- `survey-polling-schema.ts`
- `communication-analytics-schema.ts`
- `push-notifications.ts`

**Duplicates to Resolve:**
- `campaignStatusEnum` (in 2 files)

**Primary Exports:**
- `messages` table
- `notifications` table
- `newsletters` table
- `surveys` table

---

#### 7. **Documents Domain** (`domains/documents/`)
**Purpose:** Document storage and e-signatures  
**Files:** 4 schemas → 1 unified module  
**Lines:** ~700 LOC  
**Priority:** 7

**Schemas:**
- `documents-schema.ts`
- `member-documents-schema.ts`
- `e-signature-schema.ts`
- `signature-workflows-schema.ts`

**Duplicates to Resolve:**
- `signerStatusEnum` (in 2 files)
- `signatureProviderEnum` (in 2 files)

**Primary Exports:**
- `documents` table
- `documentSignatures` table
- `signatureWorkflows` table

---

#### 8. **Scheduling Domain** (`domains/scheduling/`)
**Purpose:** Calendars, events, and training  
**Files:** 2 schemas → 1 unified module  
**Lines:** ~400 LOC  
**Priority:** 8

**Schemas:**
- `calendar-schema.ts` (517 lines)
- `education-training-schema.ts`

**Duplicates to Resolve:**
- `syncStatusEnum` (in 2 files)

**Primary Exports:**
- `calendarEvents` table
- `trainingCourses` table

---

#### 9. **Compliance Domain** (`domains/compliance/`)
**Purpose:** Regulatory compliance and privacy  
**Files:** 9 schemas → 1 unified module  
**Lines:** ~1,100 LOC  
**Priority:** 9

**Schemas:**
- `provincial-privacy-schema.ts`
- `gdpr-compliance-schema.ts`
- `geofence-privacy-schema.ts`
- `indigenous-data-schema.ts`
- `lmbp-immigration-schema.ts`
- `force-majeure-schema.ts`
- `employer-non-interference-schema.ts`
- `whiplash-prevention-schema.ts`
- `certification-management-schema.ts`

**Primary Exports:**
- `privacyConsents` table
- `indigenousDataAudits` table
- `forceMainjeureLogs` table

---

#### 10. **Data Domain** (`domains/data/`)
**Purpose:** External data integration  
**Files:** 4 schemas → 1 unified module  
**Lines:** ~600 LOC  
**Priority:** 10

**Schemas:**
- `wage-benchmarks-schema.ts`
- `lrb-agreements-schema.ts`
- `arbitration-precedents-schema.ts`
- `congress-memberships-schema.ts`

**Primary Exports:**
- `wageBenchmarks` table
- `lrbCases` table
- `arbitrationPrecedents` table

---

#### 11. **ML Domain** (`domains/ml/`)
**Purpose:** Machine learning and AI features  
**Files:** 2 schemas → 1 unified module  
**Lines:** ~400 LOC  
**Priority:** 11

**Schemas:**
- `ml-predictions-schema.ts` (deprecated, merged)
- `ai-chatbot-schema.ts`

**Primary Exports:**
- `mlModels` table
- `aiConversations` table

---

#### 12. **Analytics Domain** (`domains/analytics/`)
**Purpose:** Reporting and analytics  
**Files:** 3 schemas → 1 unified module  
**Lines:** ~500 LOC  
**Priority:** 12

**Schemas:**
- `analytics.ts`
- `analytics-reporting-schema.ts` (593 lines)
- `reports-schema.ts`

**Duplicates to Resolve:**
- `mlPredictions` (merged from ml-predictions-schema)

**Primary Exports:**
- `analyticsEvents` table
- `reports` table
- `mlPredictions` table (canonical)

---

#### 13. **Infrastructure Domain** (`domains/infrastructure/`)
**Purpose:** System infrastructure and integrations  
**Files:** 20 schemas → 1 unified module  
**Lines:** ~3,000 LOC (largest)  
**Priority:** 13 (last)

**Schemas:**
- `audit-security-schema.ts`
- `feature-flags-schema.ts`
- `user-uuid-mapping-schema.ts` (migration artifact)
- `alerting-automation-schema.ts` (595 lines - large)
- `automation-rules-schema.ts`
- `recognition-rewards-schema.ts` (563 lines)
- `award-templates-schema.ts`
- `organizing-tools-schema.ts` (727 lines - largest)
- `sharing-permissions-schema.ts`
- `cms-website-schema.ts` (717 lines - large)
- `erp-integration-schema.ts` (519 lines)
- `clc-partnership-schema.ts`
- `clc-sync-schema.ts`
- `clc-per-capita-schema.ts`
- `clc-sync-audit-schema.ts`
- `international-address-schema.ts`
- `social-media-schema.ts` (484 lines)
- `joint-trust-fmv-schema.ts`
- `defensibility-packs-schema.ts`
- `accessibility-schema.ts`

**Duplicates to Resolve:**
- `clcSyncLog` (in 3 files - use clc-partnership-schema)
- `clcWebhookLog` (in 3 files)
- `rewardWalletLedger` (in 2 files)
- `automationRules` (in 2 files)

**Rationale:** Largest domain with lowest coupling. Migrate last to avoid blocking other domains.

---

## Migration Strategy

### Phase 3: Implementation (Weeks 2-3)

#### Week 2: Core Domains (Days 8-12)
1. **Day 8:** Member domain (Priority 1)
2. **Day 9:** Claims domain (Priority 2)
3. **Day 10:** Agreements domain (Priority 3)
4. **Day 11:** Finance + Governance (Priorities 4-5)
5. **Day 12:** Communications domain (Priority 6)

#### Week 3: Supporting Domains (Days 13-17)
6. **Day 13:** Documents + Scheduling (Priorities 7-8)
7. **Day 14:** Compliance + Data (Priorities 9-10)
8. **Day 15:** ML + Analytics (Priorities 11-12)
9. **Day 16-17:** Infrastructure domain (Priority 13 - largest)

#### Week 3: Finalization (Days 18-22)
10. **Day 18:** Update all import references
11. **Day 19:** Remove deprecated schemas
12. **Day 20:** Update main index.ts
13. **Day 21:** Run full test suite
14. **Day 22:** Documentation and code review

---

## File Structure (Target)

```
db/schema/
├── index.ts                          # Main exports (simplified)
├── legacy/                           # Backup of original files
│   └── [70+ original schema files]
├── domains/
│   ├── member/
│   │   ├── index.ts
│   │   ├── profiles.ts
│   │   ├── organization-members.ts
│   │   ├── pending-profiles.ts
│   │   └── user-management.ts
│   ├── claims/
│   │   ├── index.ts
│   │   ├── claims.ts
│   │   ├── grievances.ts
│   │   ├── deadlines.ts
│   │   └── workflows.ts
│   ├── agreements/
│   │   ├── index.ts
│   │   ├── collective-agreements.ts
│   │   ├── clauses.ts
│   │   ├── intelligence.ts
│   │   └── shared-library.ts
│   ├── finance/
│   │   ├── index.ts
│   │   ├── dues.ts
│   │   ├── payments.ts
│   │   ├── accounting.ts
│   │   └── taxes.ts
│   ├── governance/
│   │   ├── index.ts
│   │   ├── committees.ts
│   │   ├── conflicts.ts
│   │   └── voting.ts
│   ├── communications/
│   │   ├── index.ts
│   │   ├── messages.ts
│   │   ├── notifications.ts
│   │   ├── newsletters.ts
│   │   ├── surveys.ts
│   │   └── analytics.ts
│   ├── documents/
│   │   ├── index.ts
│   │   ├── storage.ts
│   │   ├── signatures.ts
│   │   └── workflows.ts
│   ├── scheduling/
│   │   ├── index.ts
│   │   ├── calendar.ts
│   │   └── training.ts
│   ├── compliance/
│   │   ├── index.ts
│   │   ├── privacy.ts
│   │   ├── indigenous-data.ts
│   │   ├── immigration.ts
│   │   └── certifications.ts
│   ├── data/
│   │   ├── index.ts
│   │   ├── benchmarks.ts
│   │   ├── lrb.ts
│   │   └── precedents.ts
│   ├── ml/
│   │   ├── index.ts
│   │   ├── predictions.ts
│   │   └── chatbot.ts
│   ├── analytics/
│   │   ├── index.ts
│   │   ├── events.ts
│   │   ├── reports.ts
│   │   └── predictions.ts
│   └── infrastructure/
│       ├── index.ts
│       ├── audit.ts
│       ├── features.ts
│       ├── automation.ts
│       ├── rewards.ts
│       ├── clc.ts
│       ├── integrations.ts
│       └── [15+ other files]
```

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Schema files | 75 | 13 domains | ✅ 83% reduction |
| Import depth | 5 levels | 2 levels | ✅ 60% reduction |
| Circular deps | 0 | 0 | ✅ Maintained |
| Duplicates | 18 | 0 | ✅ Eliminated |
| Build time | ~30s | ~20s | ✅ 33% faster |
| Type check | ~45s | ~30s | ✅ 33% faster |

---

## Risk Mitigation

### Rollback Plan
1. **Backup:** Original schemas stored in `db/schema/legacy/`
2. **Git Tag:** `pre-consolidation-2026-02-11`
3. **Feature Flag:** `SCHEMA_CONSOLIDATION_ENABLED`
4. **Incremental:** Migrate one domain at a time
5. **Testing:** Full test suite after each domain

### Breaking Change Prevention
- Maintain all existing exports during migration
- Add explicit re-exports in index.ts
- Run type checking after each domain
- Update tests before removing deprecated files

---

## Next Steps

1. ✅ Phase 1 Complete: Analysis finished
2. 🔄 Phase 2 In Progress: Create domain folders
3. ⏳ Phase 3 Queued: Migrate Member domain first
4. ⏳ Phase 4 Queued: Final cleanup and validation

**Estimated Completion:** February 28, 2026
