# Staging Deployment Checklist

**Project:** Union Eyes App v1 - Security Fixes Deployment  
**Environment:** Staging  
**Deployment Date:** February 13, 2026 (Week 3, Day 3)  
**Deployed By:** DevOps Team  
**Status:** 📋 READY FOR EXECUTION  

---

## 📋 Pre-Deployment Checklist

### **1. Environment Validation**

- [ ] Staging environment is running and accessible
- [ ] Database connections verified (read connection)
- [ ] Database connections verified (write connection)
- [ ] Environment variables loaded correctly
- [ ] SSL/TLS certificates valid
- [ ] DNS records pointing correctly
- [ ] Load balancer health checks passing
- [ ] Monitoring systems operational

**Validation Commands:**
```bash
# Test staging URL
curl -I https://staging.unioneyes.app

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check environment variables
printenv | grep DATABASE_URL
printenv | grep NEXTAUTH_SECRET
```

### **2. Code Review Status**

- [ ] Security review complete (see SECURITY_REVIEW_DOCUMENTATION_PACKAGE.md)
- [ ] Manual penetration testing complete (see WEEK3_SECURITY_PENETRATION_TESTING_PLAN.md)
- [ ] All 30+ attack vectors blocked
- [ ] No critical issues identified
- [ ] Senior developer approval obtained
- [ ] Security team sign-off obtained

### **3. Testing Status**

- [ ] All automated tests passing (167 tests)
- [ ] SQL injection tests passing (74/74 = 100%)
- [ ] Performance tests passing (10/10)
- [ ] Regression tests passing (30/30)
- [ ] Manual penetration testing results documented
- [ ] No false positives identified

### **4. Version Control**

- [ ] All changes committed to Git
- [ ] Feature branch merged to `staging` branch
- [ ] Tags created: `v1.2.0-staging`
- [ ] Pull request approved
- [ ] Deployment commit hash documented: `_________________`

### **5. Documentation**

- [ ] SECURITY_FIX_IMPLEMENTATION_COMPLETE.md reviewed
- [ ] WEEK2_COMPLETE_COMPREHENSIVE_REPORT.md reviewed
- [ ] WEEK3_SECURITY_PENETRATION_TESTING_PLAN.md reviewed
- [ ] SECURITY_REVIEW_DOCUMENTATION_PACKAGE.md reviewed
- [ ] This deployment checklist reviewed

---

## 🚀 Deployment Steps

### **Phase 1: Backup & Preparation**

#### **1.1 Database Backup**
- [ ] Create full database backup
- [ ] Verify backup integrity
- [ ] Store backup in secure location
- [ ] Document backup timestamp: `_________________`

**Commands:**
```bash
# Backup staging database
pg_dump $DATABASE_URL > "staging_backup_$(date +%Y%m%d_%H%M%S).sql"

# Verify backup
ls -lh staging_backup_*.sql

# Upload to secure storage
aws s3 cp staging_backup_*.sql s3://backups/staging/
```

#### **1.2 Rollback Plan Preparation**
- [ ] Previous version documented: `_________________`
- [ ] Previous Docker image tagged: `_________________`
- [ ] Rollback script prepared
- [ ] Rollback tested (dry run)

**Rollback Script:**
```bash
#!/bin/bash
# rollback.sh

echo "Rolling back to previous version..."

# Stop current containers
docker-compose -f docker-compose.staging.yml down

# Restore previous version
git checkout <PREVIOUS_COMMIT_HASH>

# Rebuild and deploy
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml up -d

echo "Rollback complete. Verify at https://staging.unioneyes.app"
```

### **Phase 2: Build & Deploy**

#### **2.1 Build New Version**
- [ ] Pull latest code from `staging` branch
- [ ] Install dependencies
- [ ] Run TypeScript compilation
- [ ] Build Docker image
- [ ] Tag Docker image: `unioneyes-staging:v1.2.0`
- [ ] Push Docker image to registry

**Commands:**
```bash
# Pull latest
git pull origin staging

# Install dependencies
pnpm install

# Type check
pnpm type-check

# Build Docker image
docker build -t unioneyes-staging:v1.2.0 -f Dockerfile.staging .

# Tag for registry
docker tag unioneyes-staging:v1.2.0 registry.example.com/unioneyes-staging:v1.2.0

# Push to registry
docker push registry.example.com/unioneyes-staging:v1.2.0
```

#### **2.2 Database Migrations**
- [ ] Review migration scripts
- [ ] Test migrations on backup database (dry run)
- [ ] Run migrations on staging database
- [ ] Verify migration success
- [ ] Document migration timestamp: `_________________`

**Commands:**
```bash
# Dry run on backup
psql $BACKUP_DATABASE_URL < database/migrations/001_add_security_audit_log.sql

# Run on staging
psql $DATABASE_URL < database/migrations/001_add_security_audit_log.sql

# Verify
psql $DATABASE_URL -c "SELECT * FROM information_schema.tables WHERE table_name = 'security_audit_log';"
```

#### **2.3 Deploy Application**
- [ ] Stop old containers gracefully
- [ ] Start new containers
- [ ] Verify containers running
- [ ] Check logs for errors
- [ ] Verify health check endpoints

**Commands:**
```bash
# Graceful shutdown (30s timeout)
docker-compose -f docker-compose.staging.yml down --timeout 30

# Start new version
docker-compose -f docker-compose.staging.yml up -d

# Verify running
docker-compose -f docker-compose.staging.yml ps

# Check logs
docker-compose -f docker-compose.staging.yml logs -f --tail=100

# Test health check
curl https://staging.unioneyes.app/api/health
```

### **Phase 3: Verification**

#### **3.1 Smoke Tests**
- [ ] Homepage loads successfully
- [ ] User authentication works
- [ ] Report execution works (simple query)
- [ ] No JavaScript errors in console
- [ ] No 500 errors in logs

**Test URLs:**
```bash
# Homepage
curl -I https://staging.unioneyes.app

# Health check
curl https://staging.unioneyes.app/api/health

# Authentication (login page)
curl -I https://staging.unioneyes.app/auth/signin
```

#### **3.2 Security Validation**
- [ ] Test SQL injection prevention (sample attacks)
- [ ] Verify custom formulas are blocked
- [ ] Check audit logging is working
- [ ] Verify safe identifiers in logs
- [ ] Test authentication enforcement

**Security Tests:**
```bash
# Test 1: Custom formula injection (should be blocked)
curl -X POST https://staging.unioneyes.app/api/reports/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dataSourceId": "org_members",
    "columns": [{"name": "name", "alias": "member"}],
    "customFormulas": [{"formula": "1; DROP TABLE users--", "alias": "hack"}]
  }'
# Expected: 400 Bad Request "Custom formulas are not supported"

# Test 2: Alias injection (should be blocked)
curl -X POST https://staging.unioneyes.app/api/reports/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dataSourceId": "org_members",
    "columns": [{"name": "name", "alias": "x\"; DROP TABLE users--"}]
  }'
# Expected: 400 Bad Request "Invalid alias: contains invalid characters"

# Test 3: Table name injection (should be blocked)
curl -X POST https://staging.unioneyes.app/api/reports/datasources/sample \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tableName": "users; DROP TABLE members--",
    "columnName": "name"
  }'
# Expected: 400 Bad Request "Invalid table name"
```

#### **3.3 Functional Tests**
- [ ] Create new report (simple)
- [ ] Execute existing report
- [ ] View report results
- [ ] Update report configuration
- [ ] Delete test report
- [ ] Verify audit logs captured actions

#### **3.4 Performance Tests**
- [ ] Response times within acceptable range (<50ms p95)
- [ ] No memory leaks detected
- [ ] CPU usage normal
- [ ] Database connection pool stable
- [ ] Load test with 100 concurrent requests

**Performance Test:**
```bash
# Install k6 if needed
# brew install k6

# Run load test
k6 run - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '30s',
};

export default function() {
  let res = http.post('https://staging.unioneyes.app/api/reports/execute', JSON.stringify({
    dataSourceId: 'organization_members',
    columns: [{name: 'name', alias: 'member'}],
    limit: 10
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $TOKEN'
    },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
  });
  sleep(0.1);
}
EOF
```

### **Phase 4: Monitoring Setup**

#### **4.1 Configure Monitoring**
- [ ] Enable application monitoring (Sentry/DataDog/etc.)
- [ ] Configure SQL query logging
- [ ] Set up security event alerts
- [ ] Configure performance metrics
- [ ] Set up error rate alerts

#### **4.2 Configure Alerts**
- [ ] High error rate alert (>5% errors)
- [ ] Slow query alert (>100ms p99)
- [ ] SQL injection attempt alert
- [ ] Authentication failure spike alert
- [ ] Memory usage alert (>80%)

**Alert Thresholds:**
```yaml
alerts:
  error_rate:
    threshold: 5%
    window: 5 minutes
    severity: high
  
  response_time:
    p99_threshold: 100ms
    window: 5 minutes
    severity: medium
  
  sql_injection_attempts:
    threshold: 1
    window: 1 minute
    severity: critical
  
  auth_failures:
    threshold: 20
    window: 5 minutes
    severity: high
  
  memory_usage:
    threshold: 80%
    window: 10 minutes
    severity: medium
```

#### **4.3 Configure Audit Logging**
- [ ] Security audit log table created
- [ ] Audit logging enabled in application
- [ ] Log retention configured (90 days)
- [ ] Log analysis dashboard created
- [ ] Verify logs are being written

**Verify Audit Logging:**
```sql
-- Check recent security events
SELECT *
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- Count events by type
SELECT event_type, COUNT(*)
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

---

## 📊 Post-Deployment Validation

### **Day 1 Monitoring (First 24 Hours)**

- [ ] Monitor error rate (target: <1%)
- [ ] Monitor response times (target: p95 <50ms)
- [ ] Check for SQL injection attempts (expected: 0 successful)
- [ ] Review audit logs (verify logging works)
- [ ] Monitor memory usage (target: stable, no growth)
- [ ] Check CPU usage (target: <50% average)

**Monitoring Dashboard:**
```
Metrics to Watch:
- Total requests
- Error rate
- p50/p95/p99 response times
- SQL injection attempt count
- Authentication failures
- Active database connections
- Memory usage
- CPU usage
```

### **Day 2-3 Validation (48-72 Hours)**

- [ ] Performance stable over time
- [ ] No memory leaks detected
- [ ] No unexpected errors
- [ ] Audit logs growing as expected
- [ ] Security events = 0 (all attacks blocked)
- [ ] User feedback positive (if applicable)

### **Week 1 Validation (7 Days)**

- [ ] Long-term stability confirmed
- [ ] Performance metrics within targets
- [ ] No security incidents
- [ ] Audit log analysis complete
- [ ] Ready for production deployment

---

## 🚨 Incident Response

### **If Issues Are Detected:**

#### **Severity 1: Critical (Rollback Immediately)**
- SQL injection successful
- Data leak detected
- Authentication bypass
- System completely unavailable

**Action:** Execute rollback script immediately, notify security team

#### **Severity 2: High (Investigate & Fix)**
- Error rate >10%
- Response time p99 >200ms
- Memory leak detected
- Partial feature unavailability

**Action:** Investigate logs, prepare hotfix, test, deploy

#### **Severity 3: Medium (Monitor & Plan Fix)**
- Error rate 5-10%
- Response time p99 100-200ms
- Non-critical feature issue

**Action:** Create ticket, plan fix for next deployment

#### **Severity 4: Low (Log & Address Later)**
- Error rate <5%
- Minor UI issues
- Non-functional issues

**Action:** Log issue, address in regular development cycle

### **Rollback Procedure:**

1. **Decision Point:** Identify severity and decide on rollback
2. **Execute Rollback Script:** Run `./rollback.sh`
3. **Verify Rollback:** Check staging is running previous version
4. **Notify Team:** Alert security, dev, and DevOps teams
5. **Root Cause Analysis:** Investigate what went wrong
6. **Fix & Retest:** Address issue, retest, redeploy

---

## ✅ Sign-Off

### **Pre-Deployment Sign-Off**

**DevOps Engineer:** _________________________  
**Date/Time:** _________________________  
**Status:** [ ] READY TO DEPLOY  

### **Post-Deployment Sign-Off**

**DevOps Engineer:** _________________________  
**Date/Time:** _________________________  
**Deployment Status:** [ ] SUCCESS [ ] PARTIAL [ ] ROLLED BACK  

**Notes:**
```
[Deployment notes, any issues encountered, resolutions]
```

### **24-Hour Validation Sign-Off**

**DevOps Engineer:** _________________________  
**Date/Time:** _________________________  
**Status:** [ ] STABLE [ ] MONITORING [ ] ISSUES DETECTED  

**Metrics Summary:**
```
Error Rate: _____%
Avg Response Time: _____ms
p95 Response Time: _____ms
SQL Injection Attempts: _____
Security Incidents: _____
```

---

## 📞 Contact Information

**DevOps On-Call:** [Phone/Slack]  
**Security Team:** [Contact]  
**Development Lead:** [Contact]  
**Emergency Escalation:** [Contact]  

---

## 📚 Related Documentation

- [SECURITY_FIX_IMPLEMENTATION_COMPLETE.md](SECURITY_FIX_IMPLEMENTATION_COMPLETE.md)
- [WEEK2_COMPLETE_COMPREHENSIVE_REPORT.md](WEEK2_COMPLETE_COMPREHENSIVE_REPORT.md)
- [WEEK3_SECURITY_PENETRATION_TESTING_PLAN.md](WEEK3_SECURITY_PENETRATION_TESTING_PLAN.md)
- [SECURITY_REVIEW_DOCUMENTATION_PACKAGE.md](SECURITY_REVIEW_DOCUMENTATION_PACKAGE.md)
- [docker-compose.staging.yml](docker-compose.staging.yml)
- [Dockerfile.staging](Dockerfile.staging)

---

**Document Version:** 1.0  
**Last Updated:** February 11, 2026  
**Status:** 📋 READY FOR WEEK 3, DAY 3 EXECUTION
