# Week 3 Day 1 - Penetration Testing Execution Log

**Date:** February 11, 2026  
**Activity:** Manual SQL Injection Penetration Testing  
**Tester:** Security Team  
**Status:** 🔄 IN PROGRESS  

---

## 📋 Day 1 Overview

**Objective:** Execute first 7 manual SQL injection tests (Test Groups 1-3)  
**Timeline:** February 11-12, 2026  
**Expected Results:** 7/7 attacks blocked (100% prevention)  

---

## 🎯 Test Groups for Day 1

### **Test Group 1: Custom Formula Attacks (2 tests)**
- TC-S-001-M1: DROP TABLE via custom formula
- TC-S-001-M2: UNION injection via formula

### **Test Group 2: Alias Injection Attacks (3 tests)**
- TC-S-002-M1: DROP TABLE via alias
- TC-S-002-M2: Semicolon injection via alias
- TC-S-002-M3: Comment injection via alias

### **Test Group 3: JOIN Injection Attacks (2 tests)**
- TC-S-003-M1: Malicious table name in JOIN
- TC-S-003-M2: SQL injection in JOIN condition

---

## 🔧 Prerequisites & Setup

### **1. Environment Setup**

**Required:**
- [ ] Test environment accessible (staging or local)
- [ ] Authentication token obtained
- [ ] Database access for audit log verification
- [ ] Testing tools ready (curl, jq, psql)

**Environment Variables:**
```bash
# Set these before running tests
export TEST_URL="https://staging.unioneyes.app"  # or http://localhost:3000
export AUTH_TOKEN="your_auth_token_here"
export DATABASE_URL="your_database_connection_string"
```

**Get Authentication Token:**
```bash
# Login and extract token
curl -X POST "$TEST_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your_password"
  }' | jq -r '.token'
```

### **2. Verification Checklist**

Before starting tests, verify:
- [ ] Application is running and healthy
- [ ] Authentication works
- [ ] Audit logging is enabled
- [ ] Safe SQL identifiers are active
- [ ] Report executor is using secured version

**Health Check:**
```bash
# Test application health
curl -I "$TEST_URL/api/health"
# Expected: 200 OK

# Test authentication endpoint
curl -I "$TEST_URL/auth/signin"
# Expected: 200 OK

# Verify database connection
psql "$DATABASE_URL" -c "SELECT 1;"
# Expected: Success
```

---

## 🧪 Test Execution

### **Test Group 1: Custom Formula Attacks**

#### **TC-S-001-M1: DROP TABLE via Custom Formula**

**Attack Vector:** Inject DROP TABLE statement through custom formula field

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {"name": "name", "alias": "member_name"}
    ],
    "customFormulas": [
      {
        "formula": "1; DROP TABLE users CASCADE--",
        "alias": "malicious_formula"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-001-m1-response.json

# Display response
cat /tmp/tc-s-001-m1-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Custom formulas are not supported for security reasons"
}
```

**Verification:**
```bash
# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details, created_at 
  FROM security_audit_log 
  WHERE event_type = 'custom_formula_blocked'
  AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC 
  LIMIT 1;
"

# Verify users table still exists
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
# Expected: Table exists, returns count
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

#### **TC-S-001-M2: UNION Injection via Formula**

**Attack Vector:** Inject UNION SELECT through custom formula

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {"name": "name", "alias": "member_name"}
    ],
    "customFormulas": [
      {
        "formula": "name UNION SELECT password FROM users--",
        "alias": "password_leak"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-001-m2-response.json

cat /tmp/tc-s-001-m2-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Custom formulas are not supported for security reasons"
}
```

**Verification:**
```bash
# Verify no data leaked in response
cat /tmp/tc-s-001-m2-response.json | grep -i "password"
# Expected: No password data

# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details 
  FROM security_audit_log 
  WHERE event_type = 'custom_formula_blocked'
  AND created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC 
  LIMIT 1;
"
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

### **Test Group 2: Alias Injection Attacks**

#### **TC-S-002-M1: DROP TABLE via Alias**

**Attack Vector:** Inject DROP TABLE through column alias

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {
        "name": "name",
        "alias": "member\"; DROP TABLE users CASCADE--"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-002-m1-response.json

cat /tmp/tc-s-002-m1-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Invalid alias: contains invalid characters or SQL keywords"
}
```

**Verification:**
```bash
# Verify users table still exists
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
# Expected: Table exists

# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details 
  FROM security_audit_log 
  WHERE event_type = 'sql_injection_attempt'
  AND details LIKE '%alias%'
  AND created_at > NOW() - INTERVAL '5 minutes';
"
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

#### **TC-S-002-M2: Semicolon Injection via Alias**

**Attack Vector:** Use semicolon to execute additional SQL statements

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {
        "name": "name",
        "alias": "member; DELETE FROM organization_members--"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-002-m2-response.json

cat /tmp/tc-s-002-m2-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Invalid alias: contains invalid characters or SQL keywords"
}
```

**Verification:**
```bash
# Verify no deletion occurred
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM organization_members;"
# Expected: Count unchanged from baseline

# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details 
  FROM security_audit_log 
  WHERE created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC;
"
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

#### **TC-S-002-M3: Comment Injection via Alias**

**Attack Vector:** Use SQL comments to break out of query structure

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {
        "name": "name",
        "alias": "member\" FROM users WHERE admin=true--"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-002-m3-response.json

cat /tmp/tc-s-002-m3-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Invalid alias: contains invalid characters or SQL keywords"
}
```

**Verification:**
```bash
# Verify no admin data leaked
cat /tmp/tc-s-002-m3-response.json | grep -i "admin"
# Expected: No matches

# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details 
  FROM security_audit_log 
  WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND event_type = 'sql_injection_attempt';
"
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

### **Test Group 3: JOIN Injection Attacks**

#### **TC-S-003-M1: Malicious Table Name in JOIN**

**Attack Vector:** Inject malicious table name in JOIN clause

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {"name": "name", "alias": "member_name"}
    ],
    "joins": [
      {
        "tableName": "users; DROP TABLE organizations--",
        "columnName": "id",
        "alias": "user_data"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-003-m1-response.json

cat /tmp/tc-s-003-m1-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Invalid table name in JOIN: contains invalid characters or SQL keywords"
}
```

**Verification:**
```bash
# Verify organizations table still exists
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM organizations;"
# Expected: Table exists

# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details 
  FROM security_audit_log 
  WHERE details LIKE '%JOIN%'
  AND created_at > NOW() - INTERVAL '5 minutes';
"
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

#### **TC-S-003-M2: SQL Injection in JOIN Condition**

**Attack Vector:** Inject malicious SQL in JOIN condition

**Test Command:**
```bash
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {"name": "name", "alias": "member_name"}
    ],
    "joins": [
      {
        "tableName": "users",
        "columnName": "id\" OR \"1\"=\"1",
        "alias": "user_data"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s -o /tmp/tc-s-003-m2-response.json

cat /tmp/tc-s-003-m2-response.json | jq '.'
```

**Expected Result:**
```
HTTP Status: 400
{
  "error": "Invalid column name in JOIN: contains invalid characters or SQL keywords"
}
```

**Verification:**
```bash
# Verify no unauthorized data access
cat /tmp/tc-s-003-m2-response.json | grep -c "\"data\":"
# Expected: 0 (error response, no data)

# Check audit log
psql "$DATABASE_URL" -c "
  SELECT event_type, details 
  FROM security_audit_log 
  WHERE created_at > NOW() - INTERVAL '5 minutes'
  ORDER BY created_at DESC;
"
```

**Result:** [ ] BLOCKED [ ] VULNERABLE  
**Status Code:** _______  
**Response:** _______________________  
**Audit Logged:** [ ] YES [ ] NO  
**Notes:** _______________________  

---

## 📊 Day 1 Results Summary

### **Test Execution Status**

| Test ID | Description | Status | Blocked? | Audit Logged? |
|---------|-------------|--------|----------|---------------|
| TC-S-001-M1 | DROP TABLE via custom formula | [ ] | [ ] | [ ] |
| TC-S-001-M2 | UNION injection via formula | [ ] | [ ] | [ ] |
| TC-S-002-M1 | DROP TABLE via alias | [ ] | [ ] | [ ] |
| TC-S-002-M2 | Semicolon injection via alias | [ ] | [ ] | [ ] |
| TC-S-002-M3 | Comment injection via alias | [ ] | [ ] | [ ] |
| TC-S-003-M1 | Malicious table in JOIN | [ ] | [ ] | [ ] |
| TC-S-003-M2 | SQL in JOIN condition | [ ] | [ ] | [ ] |

### **Success Criteria**

- [ ] All 7 attacks blocked (100%)
- [ ] All attacks returned 400 Bad Request
- [ ] All attacks logged in audit log
- [ ] No data leaked in responses
- [ ] No database modifications occurred
- [ ] No false positives (legitimate requests still work)

### **Issues Found**

**Critical Issues:** _______  
**High Issues:** _______  
**Medium Issues:** _______  
**Low Issues:** _______  

**Details:**
```
[Document any issues found during testing]
```

---

## 🔍 Post-Test Validation

### **Database Integrity Check**

```bash
# Verify all critical tables exist
psql "$DATABASE_URL" -c "
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('users', 'organizations', 'organization_members')
  ORDER BY tablename;
"
# Expected: All 3 tables present

# Check for any unexpected changes
psql "$DATABASE_URL" -c "
  SELECT COUNT(*) as user_count FROM users;
  SELECT COUNT(*) as org_count FROM organizations;
  SELECT COUNT(*) as member_count FROM organization_members;
"
# Compare with baseline counts
```

### **Audit Log Review**

```bash
# Review all security events from today
psql "$DATABASE_URL" -c "
  SELECT 
    event_type,
    COUNT(*) as event_count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
  FROM security_audit_log
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY event_type
  ORDER BY event_count DESC;
"

# Review detailed events
psql "$DATABASE_URL" -c "
  SELECT 
    event_type,
    details,
    user_id,
    created_at
  FROM security_audit_log
  WHERE DATE(created_at) = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 20;
"
```

### **Application Health Check**

```bash
# Verify application still functioning normally
curl "$TEST_URL/api/health"
# Expected: 200 OK

# Test legitimate report execution
curl -X POST "$TEST_URL/api/reports/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "dataSourceId": "organization_members",
    "columns": [
      {"name": "name", "alias": "member_name"}
    ],
    "limit": 5
  }' | jq '.'
# Expected: 200 OK with data
```

---

## 📝 Next Steps

### **If All Tests Pass (100% Blocked):**
- [ ] Document results in this file
- [ ] Update WEEK3_SECURITY_PENETRATION_TESTING_PLAN.md with results
- [ ] Prepare for Day 2 testing (Test Groups 4-9, 23+ tests)
- [ ] Send Day 1 summary to security team

### **If Any Test Fails (Attack Successful):**
1. [ ] STOP all testing immediately
2. [ ] Document the vulnerability in detail
3. [ ] Assess severity (Critical/High/Medium/Low)
4. [ ] Notify security team immediately
5. [ ] Create fix for the vulnerability
6. [ ] Retest after fix
7. [ ] Resume testing only after fix validated

---

## ✅ Sign-Off

**Tester:** _________________________  
**Date/Time:** _________________________  

**Results:** [ ] ALL PASSED (7/7 blocked)  
**Results:** [ ] ISSUES FOUND (___/7 blocked)  

**Ready for Day 2:** [ ] YES [ ] NO  

**Notes:**
```
[Final notes and observations]
```

---

**Document Version:** 1.0  
**Last Updated:** February 11, 2026  
**Status:** 📝 READY FOR EXECUTION
