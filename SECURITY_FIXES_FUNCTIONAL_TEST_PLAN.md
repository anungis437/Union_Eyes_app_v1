# Security Fixes - Functional Test Plan

**Version:** 1.0  
**Date:** February 11, 2026  
**Status:** Ready for Execution  
**Test Duration:** 2-3 days (Week 2 of implementation)

---

## 📋 Executive Summary

This comprehensive test plan validates all security fixes implemented across the report execution and analytics platform. Testing covers 6 secured components with emphasis on SQL injection prevention, authentication, audit logging, and functional correctness.

### Components Under Test
1. ✅ lib/report-executor.ts (P0+P1+P2 fixes)
2. ✅ lib/safe-sql-identifiers.ts (New security module)
3. ✅ db/queries/analytics-queries.ts (Critical fix)
4. ✅ lib/database/multi-db-client.ts (Preventive fixes)
5. ✅ app/api/reports/execute/route.ts (Architectural refactor)
6. ✅ app/api/reports/datasources/sample/route.ts (Preventive hardening)
7. ✅ app/api/organizing/workplace-mapping/route.ts (Preventive hardening)

---

## 🎯 Test Objectives

### Primary Objectives
1. **Security Validation:** Verify all SQL injection vulnerabilities eliminated
2. **Functional Correctness:** Ensure report execution works as expected
3. **Performance:** Confirm no significant performance regression
4. **Audit Logging:** Validate comprehensive event tracking
5. **Error Handling:** Verify secure error messages (no information disclosure)

### Success Criteria
- ✅ All security tests pass (100% SQL injection attempts blocked)
- ✅ All functional tests pass (existing reports execute correctly)
- ✅ Performance within 10% of baseline
- ✅ Audit logs capture all security events
- ✅ Zero TypeScript compilation errors
- ✅ All 44 unit tests passing

---

## 🔬 Test Environment Setup

### Prerequisites
```bash
# 1. Install dependencies
pnpm install

# 2. Run TypeScript compilation
pnpm type-check

# 3. Run existing unit tests
pnpm test lib/safe-sql-identifiers.test.ts

# 4. Set up test database
# Ensure test organization/tenant data exists
```

### Test Data Requirements
- Valid organization IDs for testing
- Sample reports configurations
- Test user credentials (member, steward, officer, admin roles)
- Sample data in tables: claims, members, organization_members, deadlines, grievances

### Environment Variables
```env
DATABASE_URL=<test_database_url>
CLERK_SECRET_KEY=<test_clerk_key>
RATE_LIMIT_ENABLED=true
AUDIT_LOG_ENABLED=true
```

---

## 📊 Test Categories

### Category 1: Unit Tests (Automated)
**Duration:** 30 minutes  
**Tool:** Vitest

### Category 2: SQL Injection Security Tests
**Duration:** 4 hours  
**Tool:** Manual + Automated API testing

### Category 3: Functional Validation Tests
**Duration:** 6 hours  
**Tool:** Manual API testing + Integration tests

### Category 4: Performance & Load Tests
**Duration:** 4 hours  
**Tool:** k6 or Artillery

### Category 5: Audit Logging Tests
**Duration:** 2 hours  
**Tool:** Manual verification + Log analysis

---

## 🧪 Detailed Test Cases

---

## **CATEGORY 1: Unit Tests (Automated)**

### TC-U-001: Safe SQL Identifiers - Basic Validation
**Component:** lib/safe-sql-identifiers.ts  
**Priority:** P0  
**Status:** ✅ PASSING (44 tests)

**Test Command:**
```bash
pnpm vitest run __tests__/lib/safe-sql-identifiers.test.ts
```

**Expected Results:**
- ✅ All 44 tests pass
- ✅ Valid identifiers accepted
- ✅ Invalid identifiers rejected
- ✅ SQL keywords blocked
- ✅ Proper escaping applied

**Validation:**
```bash
# Should show: Test Files  1 passed (1)
#              Tests  44 passed (44)
```

---

## **CATEGORY 2: SQL Injection Security Tests**

### TC-S-001: Custom Formula Injection Attempt
**Component:** lib/report-executor.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [
      {
        "fieldId": "first_name",
        "formula": "'; DROP TABLE members; --"
      }
    ],
    "filters": [],
    "groupBy": [],
    "sortBy": [],
    "limit": 10
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Custom formulas are not supported for security reasons"
- ✅ Audit log entry: eventType='validation_failed'
- ✅ No SQL execution attempted
- ✅ Database table NOT dropped

**Validation Steps:**
1. Send malicious payload
2. Verify 400 response
3. Check audit logs for rejection
4. Verify `members` table still exists

---

### TC-S-002: Malicious Alias Injection
**Component:** lib/report-executor.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [
      {
        "fieldId": "first_name",
        "alias": "name'; DROP TABLE members; --"
      }
    ],
    "filters": [],
    "groupBy": [],
    "sortBy": [],
    "limit": 10
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid alias format"
- ✅ Alias validation regex blocks special characters
- ✅ No database modification

---

### TC-S-003: Malicious JOIN Configuration
**Component:** lib/report-executor.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute (if JOIN support added)

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [{"fieldId": "first_name"}],
    "joins": [
      {
        "table": "invoices; DROP TABLE members; --",
        "on": "members.id = invoices.member_id"
      }
    ]
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid JOIN table reference"
- ✅ Table validation prevents injection

---

### TC-S-004: Table Name Injection (Datasources Sample)
**Component:** app/api/reports/datasources/sample/route.ts  
**Priority:** P1  
**Endpoint:** GET /api/reports/datasources/sample?sourceId=members; DROP TABLE users; --&fieldId=first_name

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid data source table"
- ✅ Allowlist validation blocks unknown table
- ✅ Safe identifier function escapes properly

---

### TC-S-005: Column Name Injection (Workplace Mapping)
**Component:** app/api/organizing/workplace-mapping/route.ts  
**Priority:** P1  
**Endpoint:** GET /api/organizing/workplace-mapping?campaignId=123&viewType=department'; DROP TABLE organizing_contacts; --

**Expected Results:**
- ✅ HTTP 200 OK (viewType not in allowlist → defaults to 'department')
- ✅ Allowlist maps invalid value to safe default
- ✅ safeColumnName() escapes identifier
- ✅ No SQL syntax error
- ✅ Valid results returned

---

### TC-S-006: LIKE Pattern Injection
**Component:** lib/report-executor.ts  
**Priority:** P1  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [{"fieldId": "first_name"}],
    "filters": [
      {
        "fieldId": "first_name",
        "operator": "contains",
        "value": "'; DELETE FROM members WHERE '1'='1"
      }
    ]
  }
}
```

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ LIKE pattern safely escaped
- ✅ Query executes with literal string match (finds no results)
- ✅ No database modification
- ✅ Audit log shows successful execution

---

### TC-S-007: SQL Injection via Filter Value
**Component:** lib/report-executor.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [{"fieldId": "first_name"}],
    "filters": [
      {
        "fieldId": "status",
        "operator": "equals",
        "value": "active' OR '1'='1"
      }
    ]
  }
}
```

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Parameterized query prevents injection
- ✅ Searches for exact string: "active' OR '1'='1"
- ✅ Returns 0 results (no status matches that exact value)
- ✅ Does NOT return all records

---

### TC-S-008: Unicode/Special Character Bypass Attempt
**Component:** lib/safe-sql-identifiers.ts  
**Priority:** P1

**Test Cases:**
```javascript
// Should all be rejected or safely escaped
safeIdentifier("test\x00name");  // Null byte
safeIdentifier("test\u0000name"); // Unicode null
safeIdentifier("test\nname");     // Newline
safeIdentifier("test\r\nname");   // CRLF
safeIdentifier("test;--");        // SQL comment
```

**Expected Results:**
- ✅ Invalid identifiers rejected
- ✅ Valid identifiers properly escaped
- ✅ PostgreSQL identifier limits enforced (63 chars)
- ✅ No bypass via encoding

---

## **CATEGORY 3: Functional Validation Tests**

### TC-F-001: Basic Report Execution
**Component:** app/api/reports/execute/route.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [
      {"fieldId": "first_name"},
      {"fieldId": "last_name"},
      {"fieldId": "email"}
    ],
    "filters": [],
    "groupBy": [],
    "sortBy": [{"fieldId": "last_name", "direction": "asc"}],
    "limit": 10
  }
}
```

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Returns JSON with success=true
- ✅ data[] contains member records
- ✅ rowCount matches data.length
- ✅ executionTime > 0
- ✅ Audit log entry created

**Validation:**
```javascript
expect(response.status).toBe(200);
expect(response.data.success).toBe(true);
expect(Array.isArray(response.data.data)).toBe(true);
expect(response.data.rowCount).toBeGreaterThan(0);
```

---

### TC-F-002: Aggregation Functions
**Component:** lib/report-executor.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "claims",
    "fields": [
      {"fieldId": "status"},
      {"fieldId": "amount", "aggregation": "sum", "alias": "total_amount"},
      {"fieldId": "id", "aggregation": "count", "alias": "claim_count"}
    ],
    "filters": [],
    "groupBy": ["status"],
    "sortBy": [{"fieldId": "status", "direction": "asc"}]
  }
}
```

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Results grouped by status
- ✅ Aggregations calculated correctly
- ✅ Column aliases applied
- ✅ SUM, COUNT functions work

---

### TC-F-003: Complex Filtering
**Component:** lib/report-executor.ts  
**Priority:** P0  
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [{"fieldId": "first_name"}, {"fieldId": "status"}],
    "filters": [
      {
        "fieldId": "status",
        "operator": "equals",
        "value": "active",
        "logicalOperator": "AND"
      },
      {
        "fieldId": "created_at",
        "operator": "greater_than",
        "value": "2025-01-01",
        "logicalOperator": "AND"
      }
    ],
    "limit": 50
  }
}
```

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Returns only active members created after 2025-01-01
- ✅ Multiple filters applied with AND logic
- ✅ Results match expected criteria

---

### TC-F-004: All Supported Data Sources
**Component:** lib/report-executor.ts  
**Priority:** P1

**Test Each Source:**
1. claims
2. members
3. organization_members
4. deadlines
5. grievances

**For Each Source:**
```json
{
  "config": {
    "dataSourceId": "<source>",
    "fields": [{"fieldId": "id"}],
    "filters": [],
    "limit": 5
  }
}
```

**Expected Results:**
- ✅ All sources return valid data
- ✅ Tenant isolation enforced
- ✅ No cross-organization leakage

---

### TC-F-005: Sample Data Retrieval
**Component:** app/api/reports/datasources/sample/route.ts  
**Priority:** P1  
**Endpoint:** GET /api/reports/datasources/sample?sourceId=members&fieldId=first_name

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Returns samples array with ≤3 items
- ✅ Each sample has 'value' property
- ✅ Only non-NULL values returned
- ✅ Organization filtering applied

---

### TC-F-006: Workplace Mapping Views
**Component:** app/api/organizing/workplace-mapping/route.ts  
**Priority:** P1  
**Endpoint:** GET /api/organizing/workplace-mapping?campaignId=<id>&viewType=department

**Test All View Types:**
1. viewType=department
2. viewType=shift
3. viewType=support_level
4. viewType=invalid (should default to department)

**Expected Results:**
- ✅ HTTP 200 OK
- ✅ Returns grouped statistics
- ✅ Aggregations calculated correctly
- ✅ Invalid viewType defaults safely

---

### TC-F-007: Analytics Query Updates
**Component:** db/queries/analytics-queries.ts  
**Priority:** P0  
**Function:** updateReport()

**Test Code:**
```typescript
await updateReport('report-id-123', 'tenant-id-456', {
  name: 'Updated Report Name',
  description: 'New description',
  config: { /* valid config */ }
});
```

**Expected Results:**
- ✅ Report updated successfully
- ✅ SQL uses proper parameterization
- ✅ safeColumnName() applied to all columns
- ✅ No SQL syntax errors
- ✅ Updated values persisted

---

## **CATEGORY 4: Performance & Load Tests**

### TC-P-001: Report Execution Performance Baseline
**Component:** app/api/reports/execute/route.ts  
**Priority:** P1  
**Tool:** k6

**Test Script:**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  const payload = JSON.stringify({
    config: {
      dataSourceId: 'members',
      fields: [{ fieldId: 'first_name' }],
      filters: [],
      limit: 100
    }
  });
  
  const res = http.post('http://localhost:3000/api/reports/execute', payload, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'execution under 500ms': (r) => r.timings.duration < 500,
  });
}
```

**Expected Results:**
- ✅ 95% of requests complete under 500ms
- ✅ No failed requests
- ✅ No rate limit errors (proper spacing)
- ✅ Memory usage stable

---

### TC-P-002: Safe Identifier Function Performance
**Component:** lib/safe-sql-identifiers.ts  
**Priority:** P2  
**Tool:** Benchmark test

**Benchmark Code:**
```typescript
import { safeIdentifier, safeColumnName, safeTableName } from '@/lib/safe-sql-identifiers';

const iterations = 10000;
console.time('safeIdentifier-10k');
for (let i = 0; i < iterations; i++) {
  safeIdentifier('test_column_name');
}
console.timeEnd('safeIdentifier-10k');
```

**Expected Results:**
- ✅ 10,000 calls complete under 100ms
- ✅ No memory leaks
- ✅ Performance acceptable for production

---

### TC-P-003: Complex Query Performance
**Component:** lib/report-executor.ts  
**Priority:** P1

**Test Scenario:**
- Large dataset (10,000+ records)
- Multiple aggregations
- Complex filters
- Multiple GROUP BY fields

**Expected Results:**
- ✅ Query completes under 5 seconds
- ✅ Performance comparable to pre-fix baseline (±10%)
- ✅ Database indexes utilized

---

## **CATEGORY 5: Authentication & Authorization Tests**

### TC-A-001: Unauthenticated Access Blocked
**Component:** All API routes  
**Priority:** P0

**Test:**
```bash
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Content-Type: application/json" \
  -d '{"config": {...}}'
```

**Expected Results:**
- ✅ HTTP 401 Unauthorized
- ✅ Error: "Authentication required"
- ✅ No data returned

---

### TC-A-002: Insufficient Role Access Denied
**Component:** app/api/reports/execute/route.ts  
**Priority:** P0

**Test:**
- Authenticate as 'member' role
- Attempt to execute report (requires 'officer' role)

**Expected Results:**
- ✅ HTTP 403 Forbidden
- ✅ Error: "Requires officer role"
- ✅ Audit log entry

---

### TC-A-003: Rate Limiting Enforcement
**Component:** All API routes  
**Priority:** P1

**Test:**
- Execute 31 report requests within rate limit window
- RATE_LIMITS.REPORT_EXECUTION = {limit: 30, window: 3600}

**Expected Results:**
- ✅ First 30 requests succeed (HTTP 200)
- ✅ 31st request fails (HTTP 429)
- ✅ Error: "Rate limit exceeded"
- ✅ resetIn value provided
- ✅ Audit log entry for rate limit violation

---

### TC-A-004: Tenant Isolation
**Component:** All API routes  
**Priority:** P0

**Test:**
- User from Org A attempts to access Org B data
- Provide Org B ID in request

**Expected Results:**
- ✅ HTTP 403 Forbidden
- ✅ No cross-tenant data leakage
- ✅ Only returns data for authenticated user's organization

---

## **CATEGORY 6: Audit Logging Tests**

### TC-L-001: Successful Report Execution Logged
**Component:** app/api/reports/execute/route.ts  
**Priority:** P1

**Test:**
1. Execute valid report
2. Check audit logs

**Expected Log Entry:**
```json
{
  "timestamp": "2026-02-11T...",
  "userId": "user_123",
  "endpoint": "/api/reports/execute",
  "method": "POST",
  "eventType": "success",
  "severity": "low",
  "details": {
    "dataSource": "members",
    "fieldCount": 3,
    "filterCount": 0,
    "rowCount": 10,
    "executionTime": 45,
    "success": true,
    "organizationId": "org_456"
  }
}
```

**Validation:**
- ✅ Log entry exists
- ✅ All required fields present
- ✅ Timestamp accurate
- ✅ Details complete

---

### TC-L-002: Validation Failure Logged
**Component:** app/api/reports/execute/route.ts  
**Priority:** P1

**Test:**
1. Submit invalid config (custom formula)
2. Check audit logs

**Expected Log Entry:**
```json
{
  "eventType": "validation_failed",
  "severity": "medium",
  "details": {
    "reason": "Custom formulas are not supported for security reasons",
    "dataSource": "members",
    "organizationId": "org_456"
  }
}
```

**Validation:**
- ✅ Rejection logged
- ✅ Reason captured
- ✅ No sensitive data in logs

---

### TC-L-003: Error Logging (No Information Disclosure)
**Component:** All API routes  
**Priority:** P0

**Test:**
1. Trigger internal error (e.g., database connection failure)
2. Check response AND audit logs

**Expected Results:**
- ✅ Response: Generic error message "Failed to execute report"
- ✅ Response: NO stack traces, NO database details
- ✅ Audit log: Contains actual error details (for debugging)
- ✅ Audit log: error.message captured
- ✅ User sees safe error, admins can debug from logs

---

### TC-L-004: Rate Limit Violation Logged
**Component:** All API routes  
**Priority:** P1

**Test:**
1. Exceed rate limit
2. Check audit logs

**Expected Log Entry:**
```json
{
  "eventType": "auth_failed",
  "severity": "medium",
  "details": {
    "reason": "Rate limit exceeded",
    "resetIn": 3540
  }
}
```

---

## **CATEGORY 7: Error Handling Tests**

### TC-E-001: Invalid Data Source
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "invalid_table",
    "fields": [{"fieldId": "id"}]
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid data source: invalid_table"
- ✅ No database query attempted

---

### TC-E-002: Invalid Field ID
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [{"fieldId": "invalid_column"}]
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid field: invalid_column"

---

### TC-E-003: Invalid Operator
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members",
    "fields": [{"fieldId": "first_name"}],
    "filters": [{
      "fieldId": "status",
      "operator": "invalid_operator",
      "value": "active"
    }]
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid operator: invalid_operator"

---

### TC-E-004: Missing Required Fields
**Endpoint:** POST /api/reports/execute

**Test Payload:**
```json
{
  "config": {
    "dataSourceId": "members"
    // Missing required "fields" array
  }
}
```

**Expected Results:**
- ✅ HTTP 400 Bad Request
- ✅ Error: "Invalid report configuration"

---

## **CATEGORY 8: Regression Tests**

### TC-R-001: Existing Saved Reports Still Execute
**Priority:** P0

**Test:**
1. Execute all existing saved reports in database
2. Compare results with baseline (if available)

**Expected Results:**
- ✅ All reports execute successfully
- ✅ No breaking changes
- ✅ Results match baseline (within acceptable variance)

---

### TC-R-002: Report Builder UI Compatibility
**Priority:** P1

**Test:**
1. Use report builder UI to create report
2. Execute report via UI
3. Verify results display correctly

**Expected Results:**
- ✅ UI report creation works
- ✅ Generated config valid
- ✅ Execution successful
- ✅ Results render properly

---

## 📈 Test Execution Plan

### Day 1: Automated & Security Tests (6 hours)
- ⏱️ 08:00-08:30: Environment setup
- ⏱️ 08:30-09:00: Run unit tests (TC-U-001)
- ⏱️ 09:00-12:00: SQL injection tests (TC-S-001 through TC-S-008)
- ⏱️ 13:00-15:00: Authentication & authorization tests (TC-A-001 through TC-A-004)
- ⏱️ 15:00-17:00: Error handling tests (TC-E-001 through TC-E-004)

### Day 2: Functional & Performance Tests (8 hours)
- ⏱️ 08:00-12:00: Functional validation (TC-F-001 through TC-F-007)
- ⏱️ 13:00-15:00: Performance tests (TC-P-001 through TC-P-003)
- ⏱️ 15:00-17:00: Audit logging tests (TC-L-001 through TC-L-004)
- ⏱️ 17:00-18:00: Regression tests (TC-R-001, TC-R-002)

### Day 3: Issues & Documentation (4 hours)
- ⏱️ 08:00-10:00: Fix any identified issues
- ⏱️ 10:00-11:00: Retest failed cases
- ⏱️ 11:00-12:00: Document results and create test report

---

## 🎯 Success Metrics

### Required for Production Release
- ✅ **Security Tests:** 100% pass rate (0 bypasses allowed)
- ✅ **Functional Tests:** 95%+ pass rate
- ✅ **Performance Tests:** Within 10% of baseline
- ✅ **Unit Tests:** 100% pass rate (all 44 tests)
- ✅ **TypeScript:** Zero compilation errors
- ✅ **Audit Logging:** All events captured correctly

### Optional Improvements
- Performance optimization if >10% regression detected
- Additional test coverage for edge cases
- Load testing with higher concurrency

---

## 🐛 Defect Tracking

### Severity Levels
- **P0 - Critical:** Security bypass or data corruption
- **P1 - High:** Major functional failure
- **P2 - Medium:** Minor functional issue
- **P3 - Low:** Cosmetic or documentation issue

### Defect Template
```markdown
## Defect ID: DEF-001
**Severity:** P0
**Component:** lib/report-executor.ts
**Test Case:** TC-S-001
**Description:** Custom formula injection not blocked
**Steps to Reproduce:**
1. Submit report with formula field
2. Observe execution
**Expected:** 400 error
**Actual:** 200 success, formula executed
**Fix Required:** Add formula validation check
```

---

## 📊 Test Report Template

### Executive Summary
- Total test cases executed: X
- Passed: Y
- Failed: Z
- Pass rate: (Y/X * 100)%

### Security Test Results
- SQL injection attempts blocked: X/X (100%)
- Authentication tests passed: X/X
- Authorization tests passed: X/X

### Functional Test Results
- Report execution: PASS/FAIL
- Data sources: X/5 working
- Aggregations: PASS/FAIL

### Performance Test Results
- Average execution time: Xms
- 95th percentile: Xms
- Performance vs baseline: +X%

### Issues Identified
- [List of defects with severity]

### Recommendations
- [Production readiness assessment]
- [Additional testing needed]
- [Performance optimization suggestions]

---

## 🔧 Testing Tools & Commands

### Run Unit Tests
```bash
pnpm vitest run __tests__/lib/safe-sql-identifiers.test.ts --reporter=verbose
```

### Run TypeScript Checks
```bash
pnpm tsc --noEmit --incremental --pretty false
```

### API Testing (Manual)
```bash
# Using curl
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d @test-payloads/basic-report.json

# Using httpie
http POST localhost:3000/api/reports/execute \
  Authorization:"Bearer $TOKEN" < test-payloads/malicious-formula.json
```

### Load Testing (k6)
```bash
k6 run performance-tests/report-execution.js
```

### Check Audit Logs
```bash
# Docker logs
docker logs union-eyes-app | grep "API_SECURITY_AUDIT"

# Database query
SELECT * FROM audit_logs 
WHERE endpoint = '/api/reports/execute' 
ORDER BY timestamp DESC 
LIMIT 100;
```

---

## 📚 References

### Related Documentation
- [COMPREHENSIVE_SECURITY_AUDIT_RESPONSE.md](COMPREHENSIVE_SECURITY_AUDIT_RESPONSE.md) - Original security audit
- [REPORT_EXECUTOR_SECURITY_FIXES.md](REPORT_EXECUTOR_SECURITY_FIXES.md) - P0+P1+P2 implementation
- [REPORTS_EXECUTE_ROUTE_REFACTORING.md](REPORTS_EXECUTE_ROUTE_REFACTORING.md) - Execute route fixes
- [SECURITY_FIX_IMPLEMENTATION_COMPLETE.md](SECURITY_FIX_IMPLEMENTATION_COMPLETE.md) - Overall status

### Security Best Practices
- OWASP Top 10 - SQL Injection Prevention
- PostgreSQL Security Documentation
- Drizzle ORM Security Guidelines

---

## ✅ Test Plan Approval

**Created By:** GitHub Copilot (Claude Sonnet 4.5)  
**Reviewed By:** _[Pending]_  
**Approved By:** _[Pending]_  
**Date:** February 11, 2026

---

**Status:** Ready for execution. All test cases defined, environment requirements documented, and success criteria established. Proceed to Week 2 testing phase.
