# Week 3: Security Penetration Testing Plan

**Date:** February 12-16, 2026  
**Phase:** Security Team Review & Penetration Testing  
**Status:** 🔴 IN PROGRESS  
**Purpose:** Manual validation of all security fixes before production deployment

---

## 🎯 Objectives

1. **Manual SQL Injection Testing** - Attempt all 30+ attack vectors from automated tests
2. **Security Review** - Code review by security team
3. **Penetration Testing** - White-box and black-box testing
4. **Performance Validation** - Confirm no degradation under attack
5. **Documentation Review** - Verify completeness and accuracy
6. **Final Sign-Off** - Security approval for production deployment

---

## 📋 Week 3 Schedule

### **Day 1 (February 12)** - Security Team Briefing & Manual Testing Setup
- Morning: Security team briefing on Week 1-2 work
- Afternoon: Set up penetration testing environment
- Evening: Begin manual SQL injection attempts

### **Day 2 (February 13)** - Penetration Testing Execution
- Morning: Execute all 30 SQL injection attack vectors manually
- Afternoon: Attempt bypasses and edge cases
- Evening: Document findings and attempt sophisticated attacks

### **Day 3 (February 14)** - Code Review & Staging Deployment
- Morning: Security team code review
- Afternoon: Deploy to staging environment
- Evening: Validate fixes in staging

### **Day 4 (February 15)** - Performance & Load Testing in Staging
- Morning: Performance validation under normal load
- Afternoon: Performance validation under attack scenarios
- Evening: Monitor security events and audit logs

### **Day 5 (February 16)** - Final Review & Sign-Off
- Morning: Review all findings and documentation
- Afternoon: Security team final approval
- Evening: Prepare production deployment plan

---

## 🔐 Manual SQL Injection Testing Scenarios

### Phase 1: Basic Injection Attempts (30 scenarios)

#### **Test Group 1: Custom Formula Attacks** (2 tests)
```bash
# TC-S-001-M1: DROP TABLE via custom formula
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "organization_members",
      "fields": [{
        "fieldId": "id",
        "fieldName": "id",
        "formula": "'; DROP TABLE organization_members; --"
      }]
    }
  }'

# Expected: 400 Bad Request with "Custom formulas are not supported"
# Audit log should capture attempt with SECURITY_VIOLATION

# TC-S-001-M2: UNION injection via formula
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "organization_members",
      "fields": [{
        "fieldId": "id",
        "fieldName": "id",
        "formula": "id UNION SELECT password FROM users WHERE 1=1"
      }]
    }
  }'

# Expected: 400 Bad Request with formula rejection
```

#### **Test Group 2: Alias Injection Attacks** (3 tests)
```bash
# TC-S-002-M1: DROP TABLE via column alias
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "status",
        "fieldName": "status",
        "alias": "status_name'; DROP TABLE claims; --"
      }]
    }
  }'

# Expected: 400 Bad Request with "Invalid SQL identifier"

# TC-S-002-M2: Semicolon injection via alias
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "claim_number",
        "fieldName": "claim_number",
        "alias": "claim_num; DELETE FROM audit_logs WHERE 1=1"
      }]
    }
  }'

# Expected: 400 Bad Request - alias validation failure

# TC-S-002-M3: Comment injection via alias
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "priority",
        "fieldName": "priority",
        "alias": "priority /* AND 1=1 */ --"
      }]
    }
  }'

# Expected: 400 Bad Request - invalid identifier
```

#### **Test Group 3: JOIN Injection Attacks** (2 tests)
```bash
# TC-S-003-M1: Malicious table in JOIN
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "joins": [{
        "table": "organization_members WHERE 1=1; DROP TABLE claims; --",
        "type": "left",
        "on": {"leftField": "member_id", "rightField": "id"}
      }]
    }
  }'

# Expected: 400 Bad Request - table name validation failure

# TC-S-003-M2: SQL in JOIN condition
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "joins": [{
        "table": "organization_members",
        "type": "inner",
        "on": {
          "leftField": "member_id'; DROP TABLE users; --",
          "rightField": "id"
        }
      }]
    }
  }'

# Expected: 400 Bad Request - field name validation failure
```

#### **Test Group 4: Table Name Attacks** (4 tests)
```bash
# TC-S-004-M1: DROP TABLE in table name
# Attempt via datasources route (if accessible)
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "claims; DROP TABLE organization_members; --",
    "limit": 10
  }'

# Expected: 400 Bad Request - table not in allowlist

# TC-S-004-M2: UNION in table name
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "claims UNION SELECT * FROM users",
    "limit": 10
  }'

# Expected: 400 Bad Request - table validation failure

# TC-S-004-M3: Nested query in table name
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "(SELECT * FROM passwords)",
    "limit": 10
  }'

# Expected: 400 Bad Request - invalid table identifier

# TC-S-004-M4: SQL injection via schema qualification
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "public.claims'; DROP TABLE users; --",
    "limit": 10
  }'

# Expected: 400 Bad Request - schema validation failure
```

#### **Test Group 5: Column Name Attacks** (5 tests)
```bash
# TC-S-005-M1: DROP TABLE via column name
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "claims",
    "columns": ["id", "claim_number'; DROP TABLE claims; --"],
    "limit": 10
  }'

# Expected: 400 Bad Request - column not in allowlist

# TC-S-005-M2: Comment injection in column
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "claims",
    "columns": ["id /* malicious comment */", "status"],
    "limit": 10
  }'

# Expected: 400 Bad Request - invalid column identifier

# TC-S-005-M3: Nested query in column
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "malicious",
        "fieldName": "(SELECT password FROM users LIMIT 1)"
      }]
    }
  }'

# Expected: 400 Bad Request - field doesn't exist

# TC-S-005-M4: UNION in column selection
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "claims",
    "columns": ["id UNION SELECT password FROM users"],
    "limit": 10
  }'

# Expected: 400 Bad Request - column validation failure

# TC-S-005-M5: Function injection in column
curl -X POST http://localhost:3000/api/reports/datasources/sample \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "claims",
    "columns": ["id, pg_sleep(10)"],
    "limit": 10
  }'

# Expected: 400 Bad Request - invalid column
```

#### **Test Group 6: Filter Field Attacks** (2 tests)
```bash
# TC-S-006-M1: SQL injection in filter field name
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "malicious_field",
        "fieldName": "status'; DROP TABLE claims; --",
        "operator": "eq",
        "value": "active"
      }]
    }
  }'

# Expected: 400 Bad Request - field doesn't exist

# TC-S-006-M2: UNION in filter field
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "bad_field",
        "fieldName": "status UNION SELECT password FROM users",
        "operator": "eq",
        "value": "active"
      }]
    }
  }'

# Expected: 400 Bad Request - invalid field
```

#### **Test Group 7: Filter Value Attacks** (3 tests)
```bash
# TC-S-007-M1: Classic OR 1=1 injection
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "status",
        "operator": "eq",
        "value": "active' OR '1'='1"
      }]
    }
  }'

# Expected: No SQL injection - value treated as literal string
# Should search for status = "active' OR '1'='1" (literal)

# TC-S-007-M2: DROP TABLE in filter value
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "claim_number",
        "operator": "eq",
        "value": "CLM-001'; DROP TABLE claims; --"
      }]
    }
  }'

# Expected: No SQL injection - parameterized query
# Should return 0 results (no claim with that exact string)

# TC-S-007-M3: UNION in filter value
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "status",
        "operator": "eq",
        "value": "active' UNION SELECT password FROM users--"
      }]
    }
  }'

# Expected: No SQL injection - value is parameterized
# Should return 0 results (no status with that value)
```

#### **Test Group 8: Chained Attack Scenarios** (3 tests)
```bash
# TC-S-008-M1: Multiple injection vectors in one request
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "organization_members",
      "fields": [{
        "fieldId": "id",
        "fieldName": "id",
        "alias": "id'; DROP TABLE users; --",
        "formula": "UNION SELECT * FROM passwords"
      }],
      "filters": [{
        "fieldId": "status",
        "fieldName": "status' OR 1=1--",
        "operator": "eq",
        "value": "' OR '1'='1"
      }]
    }
  }'

# Expected: 400 Bad Request - blocked at first validation point (formula)

# TC-S-008-M2: Time-based blind SQL injection
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "status",
        "operator": "eq",
        "value": "active'; SELECT CASE WHEN (1=1) THEN pg_sleep(10) ELSE pg_sleep(0) END--"
      }]
    }
  }'

# Expected: No SQL injection - value parameterized
# Response time should be normal (<100ms), not 10 seconds

# TC-S-008-M3: Boolean-based blind SQL injection
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "claim_number",
        "operator": "like",
        "value": "CLM%' AND (SELECT COUNT(*) FROM users) > 0 AND 'x'='x"
      }]
    }
  }'

# Expected: No SQL injection - parameterized LIKE query
# Should safely search for the literal string pattern
```

#### **Test Group 9: Advanced Bypass Attempts** (6 tests)
```bash
# TC-S-009-M1: URL encoding to bypass validation
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "status",
        "fieldName": "status",
        "alias": "status%27%3B%20DROP%20TABLE%20claims%3B%20--"
      }]
    }
  }'

# Expected: 400 Bad Request - validation happens after URL decode

# TC-S-009-M2: Unicode encoding bypass attempt
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "status",
        "fieldName": "status",
        "alias": "status\u0027; DROP TABLE claims; --"
      }]
    }
  }'

# Expected: 400 Bad Request - unicode normalized before validation

# TC-S-009-M3: Case variation bypass attempt
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "organization_members",
      "fields": [{
        "fieldId": "id",
        "fieldName": "id",
        "formula": "Id UnIoN sElEcT password fRoM users"
      }]
    }
  }'

# Expected: 400 Bad Request - formulas blocked regardless of case

# TC-S-009-M4: Whitespace evasion
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "status",
        "fieldName": "status",
        "alias": "status'/**/;/**/DROP/**/TABLE/**/claims;--"
      }]
    }
  }'

# Expected: 400 Bad Request - comment injection patterns blocked

# TC-S-009-M5: Hex encoding bypass
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{
        "fieldId": "status",
        "operator": "eq",
        "value": "0x61646d696e"
      }]
    }
  }'

# Expected: No SQL injection - value is parameterized
# Should safely search for the hex string as a literal

# TC-S-009-M6: Stacked queries attempt
curl -X POST http://localhost:3000/api/reports/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reportDefinition": {
      "dataSourceId": "claims",
      "fields": [{"fieldId": "id", "fieldName": "id"}],
      "filters": [{
        "fieldId": "status",
        "operator": "eq",
        "value": "active'; UPDATE users SET role='admin' WHERE id=1; --"
      }]
    }
  }'

# Expected: No SQL injection - parameterized query blocks stacked queries
```

---

## 🔬 Phase 2: Advanced Penetration Testing

### **Sophisticated Attack Scenarios**

#### **Scenario 1: Second-Order SQL Injection**
1. Insert malicious data into a field
2. Later retrieve and use that data in a query
3. Verify data is sanitized on retrieval

#### **Scenario 2: Polyglot Payloads**
```sql
SLEEP(1) /*' or SLEEP(1) or '" or SLEEP(1) or "*/
```

#### **Scenario 3: Out-of-Band Attacks**
- Attempt DNS exfiltration
- Verify no external connections possible

#### **Scenario 4: Error-Based Enumeration**
- Trigger intentional errors
- Verify error messages don't leak schema information

#### **Scenario 5: Mass Assignment Vulnerabilities**
- Attempt to modify unintended fields
- Verify field validation is strict

---

## 📊 Results Documentation Template

### **Attack Result Template**

```markdown
## Attack: [Attack Name]
**Test ID:** TC-S-XXX-MX
**Date:** [Date]
**Tester:** [Name]

### Payload:
```json
[Exact payload used]
```

### Expected Result:
[What should happen]

### Actual Result:
[What actually happened]

### Status:
- [ ] ✅ BLOCKED - Attack prevented as expected
- [ ] ⚠️ PARTIAL - Attack partially blocked, needs review
- [ ] ❌ VULNERABLE - Attack succeeded, critical fix needed

### Evidence:
- HTTP Response Code: [code]
- Response Body: [body]
- Audit Log Entry: [log ID]
- Database State: [verified unchanged]

### Notes:
[Additional observations]
```

---

## 🎯 Success Criteria

### **Must Pass (100% Required):**
- [ ] All 30+ SQL injection attempts blocked
- [ ] Zero successful data exfiltration
- [ ] Zero successful data modification
- [ ] Zero successful privilege escalation
- [ ] All attacks logged in audit system
- [ ] Error messages don't leak sensitive information
- [ ] Performance remains stable under attack

### **Should Pass (95%+ Required):**
- [ ] All sophisticated bypass attempts blocked
- [ ] Second-order injection attempts blocked
- [ ] Polyglot payloads handled safely
- [ ] No information disclosure in errors

---

## 📝 Security Review Checklist

### **Code Review Items:**
- [ ] All SQL queries use parameterized queries
- [ ] All identifiers validated with safe functions
- [ ] No raw SQL string concatenation
- [ ] Custom formulas disabled
- [ ] Allowlists properly enforced
- [ ] Error handling doesn't leak information
- [ ] Audit logging comprehensive
- [ ] Authentication enforced on all routes
- [ ] Authorization checks present
- [ ] Rate limiting configured

### **Architecture Review:**
- [ ] Defense-in-depth strategy implemented
- [ ] Multiple validation layers present
- [ ] Fail-secure error handling
- [ ] Principle of least privilege followed
- [ ] Input validation at API boundary
- [ ] Output encoding where needed

---

## 🚀 Next Steps After Testing

### **If All Tests Pass:**
1. ✅ Security team sign-off
2. ✅ Proceed to staging deployment
3. ✅ Performance validation in staging
4. ✅ Prepare production deployment

### **If Issues Found:**
1. ⚠️ Document all findings
2. ⚠️ Assess severity (P0/P1/P2)
3. ⚠️ Implement fixes
4. ⚠️ Re-test affected areas
5. ⚠️ Repeat penetration testing

---

## 📅 Timeline

**Day 1-2:** Manual testing execution  
**Day 3:** Findings review and potential fixes  
**Day 4:** Re-testing and staging deployment  
**Day 5:** Final approval

**Target Completion:** February 16, 2026

---

**Document Owner:** Security Team  
**Reviewers:** Development Team, DevOps  
**Status:** 🔴 READY FOR EXECUTION
