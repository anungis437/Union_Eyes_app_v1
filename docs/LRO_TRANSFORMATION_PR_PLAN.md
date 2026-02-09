# UnionEyes → Labour Relations Operating System (LRO)
## Transformation PR Plan

**Objective:** Transform UnionEyes into a world-class Labour Relations Operating System with opinionated workflows, hardened security, and LRO-first pilot packaging.

**Principles:**
- One system. Two surfaces. One truth.
- LRO-first entry must be preserved
- Focus on 3 primaries: Member communications, Grievance/case tracking, Democratic processes
- Additive changes, feature flags, minimal diffs
- PR-ready: small, reviewable, clear acceptance criteria

---

## PHASE A: WORLD-CLASS FOUNDATION GUARANTEES

### PR-1: REPO PROVENANCE GATE (source-only builds)
**Goal:** Ensure only source code is tracked in git; no build artifacts can be committed.

**Changes:**
- Remove any tracked build artifacts from git history index
- Enhance `.gitignore` to block: `.next/`, `dist/`, `build/`, `.turbo/`, `.cache/`, `coverage/`, `logs/`
- Add `scripts/check-repo-hygiene.sh` that uses `git ls-files` to detect tracked artifacts
- Add package.json script: `"repo:hygiene": "bash scripts/check-repo-hygiene.sh"`
- Add GitHub Action `.github/workflows/repo-hygiene.yml` to fail PRs with tracked artifacts

**Acceptance Criteria:**
- ✅ `pnpm repo:hygiene` passes locally
- ✅ CI fails if `.next/`, `node_modules/`, `dist/`, or `build/` are tracked
- ✅ .gitignore prevents accidental tracking

**Verification:**
```bash
pnpm repo:hygiene
git ls-files | grep -E "^(\.next|node_modules|dist|build)" && echo "FAIL" || echo "PASS"
```

---

### PR-2: API POLICY ENFORCEMENT GATE (deny-by-default)
**Goal:** Make it impossible to ship an unguarded API route by accident.

**Implementation Model:** Mandatory route guard wrapper (Option A)

**Changes:**
1. Enhance `lib/api-auth-guard.ts`:
   - Add `requireApiAuth({ tenant?: boolean, roles?: string[], allowPublic?: boolean })` wrapper
   - Exports guard function that wraps route handlers
   - Validates auth, tenant, and role requirements
   - Returns 401/403 with audit logging on failure

2. Create `config/public-api-routes.ts`:
   - Explicit allowlist with justification comments
   - Types for route configuration

3. Add CI enforcement script `scripts/check-api-guards.ts`:
   - Enumerates all `/app/api/**/route.ts` files
   - Uses AST parsing to detect if route exports use guard or are allowlisted
   - Fails if unguarded route detected

4. Add package.json script: `"validate:api-guards"`

5. Add GitHub Action `.github/workflows/api-security.yml`

**Acceptance Criteria:**
- ✅ All existing authenticated routes wrapped with `requireApiAuth()`
- ✅ Public routes explicitly allowlisted with comments
- ✅ CI fails when new unguarded route added
- ✅ `/api/health` and webhooks still work
- ✅ At least 5 representative routes updated

**Verification:**
```bash
pnpm validate:api-guards
# Should detect any route.ts without guard or allowlist entry
```

---

### PR-3: EVIDENCE & AUDIT BASELINE
**Goal:** Ensure all privileged mutations are auditable with consistent structure.

**Changes:**
1. Enhance `lib/services/audit-trail-service.ts`:
   - Add `logPrivilegedAction()` method with standard signature:
     ```typescript
     {
       actorId: string,
       actorRole: string,
       organizationId: string,
       actionType: string,
       entityType: string,
       entityId: string,
       metadata?: Record<string, any>,
       visibilityScope: 'member' | 'staff' | 'admin' | 'system'
     }
     ```
   - Helper: `sanitizeMetadata()` to remove sensitive fields

2. Instrument representative endpoints:
   - POST /api/members (create member)
   - PUT/PATCH /api/cases/:id (update case)
   - POST /api/votes/:id (create vote)
   - DELETE /api/admin/users/:id (delete user)
   - At least one endpoint per domain

3. Create documentation:
   - `docs/SECURITY.md`: Auth, tenancy, RBAC, audit, visibility scopes
   - `docs/ARCHITECTURE.md`: System architecture, "two surfaces one truth"
   - Both 1-2 pages max

**Acceptance Criteria:**
- ✅ AuditTrailService.logPrivilegedAction() exists and tested
- ✅ At least 5 endpoints write audit events on mutations
- ✅ Audit events include all required fields + visibility_scope
- ✅ docs/SECURITY.md and docs/ARCHITECTURE.md exist
- ✅ No sensitive data (passwords, tokens, SINs) in audit metadata

**Verification:**
```bash
# After mutation, check audit log
curl -X POST /api/test-mutation
# Query auditLogs table, verify entry exists with all required fields
```

---

## PHASE B: UNION OPERATING MODEL V1

### PR-4: VISIBILITY SCOPES (dual-surface enforcement)
**Goal:** Same events, different views - members see status, LROs see process.

**Canonical Entities:**
- Case (grievance/case)
- CaseEvent (timeline)
- Communication + CommunicationReceipt
- Decision/Vote + EligibilitySnapshot

**Changes:**
1. Add `visibility_scope` column to:
   - `case_events` table: `ENUM('member', 'staff', 'admin', 'system')`
   - `communication_events` table (or equivalent)

2. Create `lib/services/case-timeline-service.ts`:
   ```typescript
   - getMemberVisibleTimeline(caseId, memberId)
   - getLroVisibleTimeline(caseId, orgId)
   - addCaseEvent(payload) // auto-sets visibility_scope
   ```

3. Update case API routes to use filtered timeline helpers

4. Add integration tests proving member cannot access staff events

**Acceptance Criteria:**
- ✅ visibility_scope column added to relevant tables
- ✅ Timeline service filters events by scope
- ✅ Members cannot access staff-only events (test proves it)
- ✅ LROs can access full timeline (test proves it)
- ✅ Same event data, different views enforced

**Verification:**
```bash
pnpm test __tests__/services/case-timeline.test.ts
# Test: member role sees only member+staff scope
# Test: LRO role sees all scopes
```

---

### PR-5: OPINIONATED WORKFLOW RULES
**Goal:** Encode best practices as enforced rules, not suggestions.

**Workflow Components:**
1. **Case Lifecycle FSM:**
   - States: draft → submitted → acknowledged → investigating → resolved → closed
   - Transitions matrix with validation rules
   - Implemented in `services/case-workflow-fsm.ts`

2. **SLA Timers:**
   - Acknowledge receipt: 2 business days from submission
   - First response: 5 business days from acknowledgment
   - Computed from CaseEvent timeline

3. **Required Acknowledgments:**
   - Critical communications must have delivery + read receipt
   - Tracked in CommunicationReceipt table

4. **Eligibility Snapshot Locking:**
   - When vote opens, snapshot eligible voters
   - Lock snapshot (immutable after vote starts)

**Changes:**
1. Create `services/case-workflow-fsm.ts`:
   - `validateTransition(fromState, toState, context)`
   - `getAllowedTransitions(currentState)`
   - Pure functions, fully tested

2. Create `services/sla-calculator.ts`:
   - `calculateSlaStatus(caseId)` → { withinSla, breachRisk, daysRemaining }
   - Uses CaseEvent timeline

3. Update case mutation endpoints to validate transitions

4. Add workflow validation tests

**Acceptance Criteria:**
- ✅ Invalid case state transitions are rejected (test proves it)
- ✅ SLA breach flags can be computed from events
- ✅ Workflow FSM is pure, tested, deterministic
- ✅ At least 10 workflow validation tests pass

**Verification:**
```bash
pnpm test __tests__/services/case-workflow-fsm.test.ts
pnpm test __tests__/services/sla-calculator.test.ts
```

---

### PR-6: "DEFENSIBILITY PACK" EXPORTS
**Goal:** Generate system-of-record summaries for legal/compliance needs.

**Changes:**
1. Create `services/defensibility-pack-generator.ts`:
   - `generateCaseDefensibilityPack(caseId, viewerRole)`
   - `generateVoteDefensibilityPack(voteId, viewerRole)`
   - Returns structured JSON with:
     - Timeline summary (filtered by visibility_scope)
     - Key timestamps (submitted, acknowledged, resolved)
     - Actions taken
     - Integrity checks (eligibility locked, SLA status, acknowledgments)

2. Add API endpoints:
   - GET `/api/cases/:id/defensibility` (staff/admin only)
   - GET `/api/votes/:id/defensibility` (staff/admin only)

3. Add role-based access guards

**Acceptance Criteria:**
- ✅ Defensibility pack exists for cases and votes
- ✅ Staff/admin can access, members cannot (test proves it)
- ✅ Pack includes all required fields
- ✅ Integrity checks computed from canonical events
- ✅ Export as JSON (PDF optional future)

**Verification:**
```bash
curl -H "Authorization: Bearer <staff-token>" \
  http://localhost:3000/api/cases/123/defensibility | jq .
# Verify structure includes timeline, timestamps, integrity_checks
```

---

## PHASE C: LRO COMMAND SURFACE

### PR-7: LRO "SIGNALS" API
**Goal:** Signals, not charts - actionable intelligence computed from canonical events.

**Changes:**
1. Create `services/lro-signals-service.ts`:
   - `getSignals(organizationId)` returns:
     ```typescript
     {
       cases_nearing_sla: { count, top_cases[] },
       cases_unassigned: { count, cases[] },
       member_followups_pending: { count },
       critical_comms_ack_below_threshold: { count, threshold },
       votes_turnout_trending_low: { count, votes[] } // if applicable
     }
     ```
   - All computed from CaseEvent, CommunicationReceipt, Vote tables

2. Add API endpoint:
   - GET `/api/lro/signals` (LRO role required)

3. Add caching (optional): 5-minute TTL

**Acceptance Criteria:**
- ✅ Signals endpoint returns deterministic values based on seeded data
- ✅ All signals computed from canonical events (no separate tables)
- ✅ LRO role required (test proves access control)
- ✅ Signals are actionable (include links/IDs)

**Verification:**
```bash
# Seed test data with known SLA breaches
pnpm seed:test-signals
curl -H "Authorization: Bearer <lro-token>" \
  http://localhost:3000/api/lro/signals | jq .
# Verify counts match expected values
```

---

### PR-8: MINIMAL UI PANEL (LRO command surface)
**Goal:** Lightweight signals panel in LRO dashboard.

**Changes:**
1. Create component: `components/lro/signals-panel.tsx`
   - Displays signal counts
   - Links to filtered lists
   - Minimal styling, no charts

2. Add to LRO dashboard page:
   - Route: `/[locale]/dashboard/lro`
   - Calls `/api/lro/signals`

3. Add loading states and error handling

**Acceptance Criteria:**
- ✅ Signals panel renders with real data
- ✅ Links to filtered lists work
- ✅ Panel is compact, no heavy analytics
- ✅ Loading and error states handled

**Verification:**
```bash
pnpm dev
# Navigate to /dashboard/lro
# Verify signals panel appears with counts
# Click links, verify filtered lists appear
```

---

## PHASE D: PILOT PACKAGING

### PR-9: PILOT MODE FEATURE FLAGS + DEMO LANES
**Goal:** Make it demoable and convertible for pilot orgs.

**Changes:**
1. Add `pilot_config` to organizations table:
   ```sql
   pilot_config JSONB DEFAULT '{"enabled": false, "modules": []}'
   ```

2. Create `lib/pilot-config.ts`:
   - `getPilotConfig(orgId)` → { enabled, modules: ['communications', 'cases', 'votes'] }
   - `isPilotModuleEnabled(orgId, module)`

3. Update navigation components:
   - Hide/de-emphasize non-pilot modules when pilot mode enabled
   - Show pilot badge

4. Create `docs/PILOT.md`:
   - LRO-first flow explanation
   - Member surface vs LRO surface
   - 3 metrics to track (defined in PR-10)
   - Getting started guide

**Acceptance Criteria:**
- ✅ Pilot org sees only pilot-relevant navigation
- ✅ Non-pilot org navigation unchanged
- ✅ Pilot config stored per organization
- ✅ docs/PILOT.md exists and explains flow

**Verification:**
```bash
# Enable pilot mode for test org
UPDATE organizations SET pilot_config = '{"enabled": true, "modules": ["communications", "cases"]}' WHERE id = 'test-org';
# Login as user in test org
# Verify navigation shows only pilot modules
```

---

### PR-10: METRICS INSTRUMENTATION (lightweight)
**Goal:** Track only what matters for pilot success.

**Pilot Metrics:**
1. **Communications:** Delivery rate + acknowledgment %
2. **Cases:** Time-to-first-response (computed from CaseEvent timeline)
3. **Votes:** Turnout %

**Changes:**
1. Create `services/pilot-metrics-service.ts`:
   - `getCommunicationMetrics(orgId, dateRange)`
   - `getCaseMetrics(orgId, dateRange)`
   - `getVoteMetrics(orgId, dateRange)`
   - All computed from existing events (no new tables)

2. Add API endpoint:
   - GET `/api/pilot/metrics` (staff/admin only)
   - Returns JSON summary

3. Optional: Simple metrics export (CSV/JSON)

**Acceptance Criteria:**
- ✅ Metrics computed from canonical events
- ✅ Export works for test org
- ✅ Metrics match manual calculation (validation test)
- ✅ No new tables required (purely computed)

**Verification:**
```bash
# Seed test data with known metrics
pnpm seed:pilot-metrics
curl -H "Authorization: Bearer <admin-token>" \
  "http://localhost:3000/api/pilot/metrics?orgId=test-org&start=2026-01-01&end=2026-01-31" | jq .
# Verify metrics match expected values
```

---

## TESTING STRATEGY

**Unit Tests (Vitest):**
- Workflow FSM transitions
- Visibility filtering
- SLA calculations
- Metrics computations

**Integration Tests:**
- API route auth enforcement
- Audit logging on mutations
- Member vs LRO visibility
- Pilot config navigation

**Test Coverage Target:**
- New code: >80% coverage
- Critical paths: 100% coverage

**CI Requirements:**
- All tests pass
- Linting passes
- Type checking passes
- Repo hygiene passes
- API guard validation passes

---

## IMPLEMENTATION ORDER

1. **PRs 1-3** (Foundation Guarantees) - MUST BE COMPLETED FIRST
2. **PRs 4-6** (Operating Model) - Sequential implementation
3. **PRs 7-8** (LRO Command Surface) - Can be parallel
4. **PRs 9-10** (Pilot Packaging) - Final polish

---

## SUCCESS CRITERIA

**Technical:**
- ✅ All CI checks pass
- ✅ No breaking changes to existing functionality
- ✅ Test coverage meets targets
- ✅ Docs are accurate and complete

**Product:**
- ✅ LRO-first entry preserved
- ✅ "One system, two surfaces, one truth" enforced
- ✅ Pilot mode is demoable and convertible
- ✅ Workflows are opinionated and enforced

**Security:**
- ✅ No API route can ship without guard
- ✅ All privileged mutations are audited
- ✅ Visibility scopes prevent unauthorized access
- ✅ Secrets remain out of scope (separate rotation strategy)
