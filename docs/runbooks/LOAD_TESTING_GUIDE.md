# Load Testing Guide

**Version:** 1.0.0  
**Last Updated:** February 9, 2026  
**Commit:** `bcf0aee8`

---

## Overview

This guide provides comprehensive procedures for load testing Union Eyes production infrastructure, including test scenarios, tools, metrics, and acceptance criteria.

---

## Load Testing Strategy

### Testing Philosophy

- **Realistic User Behavior:** Simulate actual user patterns (80% read, 20% write)
- **Peak Load + 50%:** Test for 1.5x expected peak traffic
- **Multi-Tenant Isolation:** Verify RLS performance under high load
- **Critical Path Focus:** Prioritize claim submission, voting, and authentication flows

---

## Test Scenarios

### Scenario 1: Claims Submission (Write-Heavy)

**User Profile:**
- 500 concurrent users
- Claims submission rate: 2 per minute per user
- Session duration: 5 minutes

**Operations:**
1. Authenticate user
2. Fetch organization context
3. Submit new claim with attachments
4. Poll for claim status update
5. View claim details

**Success Criteria:**
- P95 response time < 500ms
- P99 response time < 2000ms
- Error rate < 0.1%
- No RLS violations logged

---

### Scenario 2: Claims Dashboard (Read-Heavy)

**User Profile:**
- 2000 concurrent users
- Dashboard refresh rate: Every 30 seconds
- Session duration: 20 minutes

**Operations:**
1. Authenticate user
2. Fetch organization claims list (paginated)
3. Fetch claim statistics
4. Fetch notifications
5. View individual claim details (random)

**Success Criteria:**
- P95 response time < 300ms
- P99 response time < 1000ms
- Error rate < 0.01%
- Database connection pool < 80% utilization

---

### Scenario 3: Voting Session (Spike Test)

**User Profile:**
- 5000 concurrent users (spike from 500 in 2 minutes)
- Voting rate: 1 vote per user
- Session duration: 10 minutes

**Operations:**
1. Authenticate user
2. Fetch active election
3. Submit vote (FSM transition)
4. View election results (real-time)

**Success Criteria:**
- P95 response time < 1000ms during spike
- P99 response time < 3000ms during spike
- Error rate < 0.5%
- No duplicate votes
- FSM integrity maintained (0 invalid transitions)

---

### Scenario 4: Authentication Flow (Cold Start)

**User Profile:**
- 200 concurrent users
- Login attempts: 1 per user
- Session duration: 1 minute

**Operations:**
1. OAuth redirect (Clerk)
2. Callback processing
3. Session creation
4. Organization membership fetch
5. Dashboard redirect

**Success Criteria:**
- P95 response time < 2000ms
- P99 response time < 5000ms
- Error rate < 1%
- No session creation failures

---

### Scenario 5: API Integration (External Services)

**User Profile:**
- 100 concurrent API clients
- Request rate: 10 requests/second per client
- Duration: 60 minutes

**Operations:**
1. API key authentication
2. POST /api/v1/claims
3. GET /api/v1/claims/:id
4. PATCH /api/v1/claims/:id/status
5. GET /api/v1/analytics/dashboard

**Success Criteria:**
- P95 response time < 500ms
- P99 response time < 2000ms
- Error rate < 0.01%
- Rate limiting functional (429 responses after threshold)

---

## Tools and Infrastructure

### Recommended Tool: k6 (Open Source)

**Why k6:**
- Scriptable in JavaScript
- Built for CI/CD integration
- Excellent reporting and metrics
- Cloud execution available

**Installation:**
```bash
# Windows (via Chocolatey)
choco install k6

# Verify
k6 version
```

---

## k6 Test Scripts

### Script 1: Claims Submission Test

**File:** `load-tests/claims-submission.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up
    { duration: '5m', target: 500 },  // Peak load
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    errors: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'https://staging.unioneyes.app';
const API_KEY = __ENV.API_KEY;

export default function () {
  // 1. Authenticate
  const authRes = http.post(`${BASE_URL}/api/auth/session`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  
  check(authRes, {
    'auth successful': (r) => r.status === 200,
  });
  
  const sessionToken = authRes.json('sessionToken');
  
  // 2. Submit claim
  const claimPayload = {
    type: 'grievance',
    title: `Load Test Claim ${Date.now()}`,
    description: 'Automated load test claim submission',
    organizationId: authRes.json('organizationId'),
  };
  
  const claimRes = http.post(`${BASE_URL}/api/v1/claims`, JSON.stringify(claimPayload), {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(claimRes, {
    'claim submitted': (r) => r.status === 201,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  
  // 3. Poll for status update
  const claimId = claimRes.json('id');
  
  const statusRes = http.get(`${BASE_URL}/api/v1/claims/${claimId}`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  });
  
  check(statusRes, {
    'status fetched': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

---

### Script 2: Dashboard Read Test

**File:** `load-tests/dashboard-read.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '3m', target: 500 },
    { duration: '10m', target: 2000 },
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<1000'],
    errors: ['rate<0.0001'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'https://staging.unioneyes.app';
const API_KEY = __ENV.API_KEY;

export default function () {
  const authRes = http.post(`${BASE_URL}/api/auth/session`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  
  const sessionToken = authRes.json('sessionToken');
  
  // Batch requests (simulate dashboard load)
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/v1/claims?page=1&limit=20`, null, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    }],
    ['GET', `${BASE_URL}/api/v1/analytics/dashboard`, null, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    }],
    ['GET', `${BASE_URL}/api/notifications/count`, null, {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    }],
  ]);
  
  const success = responses.every((r) => r.status === 200);
  errorRate.add(!success);
  
  check(responses[0], {
    'claims fetched': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 300,
  });
  
  sleep(30); // Refresh every 30 seconds
}
```

---

### Script 3: Voting Spike Test

**File:** `load-tests/voting-spike.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 500 },
    { duration: '2m', target: 5000 },  // Spike
    { duration: '5m', target: 5000 },  // Sustain
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
    errors: ['rate<0.005'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'https://staging.unioneyes.app';
const API_KEY = __ENV.API_KEY;

export default function () {
  const authRes = http.post(`${BASE_URL}/api/auth/session`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  
  const sessionToken = authRes.json('sessionToken');
  
  // Get active election
  const electionsRes = http.get(`${BASE_URL}/api/voting/sessions?status=active`, {
    headers: { 'Authorization': `Bearer ${sessionToken}` },
  });
  
  const electionId = electionsRes.json('data[0].id');
  
  // Submit vote
  const votePayload = {
    electionId,
    candidateId: 'candidate_123', // TODO: Use dynamic value
  };
  
  const voteRes = http.post(`${BASE_URL}/api/voting/sessions/${electionId}/vote`, 
    JSON.stringify(votePayload), {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(voteRes, {
    'vote submitted': (r) => r.status === 201 || r.status === 409, // 409 = already voted
    'response time OK': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
  
  sleep(1);
}
```

---

## Running Load Tests

### Local Execution (Staging)

```bash
# Set environment
export API_BASE_URL="https://staging.unioneyes.app"
export API_KEY="test_api_key_xxx"

# Run single test
k6 run load-tests/claims-submission.js

# Run with custom thresholds
k6 run --vus 500 --duration 10m load-tests/dashboard-read.js

# Run with JSON output
k6 run --out json=results.json load-tests/claims-submission.js
```

---

### Cloud Execution (k6 Cloud)

**Prerequisites:**
- k6 Cloud account
- API token configured

**Run Test:**
```bash
# Login
k6 login cloud --token YOUR_K6_CLOUD_TOKEN

# Run test in cloud
k6 cloud load-tests/claims-submission.js

# Monitor results
# https://app.k6.io/runs/<run-id>
```

---

### CI/CD Integration (GitHub Actions)

**Workflow File:** `.github/workflows/load-testing.yml`

```yaml
name: Load Testing

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to test'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run Claims Submission Test
        env:
          API_BASE_URL: ${{ secrets.STAGING_API_BASE_URL }}
          API_KEY: ${{ secrets.LOAD_TEST_API_KEY }}
        run: |
          k6 run --out json=claims-submission-results.json load-tests/claims-submission.js
      
      - name: Run Dashboard Read Test
        env:
          API_BASE_URL: ${{ secrets.STAGING_API_BASE_URL }}
          API_KEY: ${{ secrets.LOAD_TEST_API_KEY }}
        run: |
          k6 run --out json=dashboard-read-results.json load-tests/dashboard-read.js
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: |
            claims-submission-results.json
            dashboard-read-results.json
      
      - name: Check Thresholds
        run: |
          if grep -q '"failed":true' claims-submission-results.json; then
            echo "❌ Claims submission test FAILED thresholds"
            exit 1
          fi
          
          if grep -q '"failed":true' dashboard-read-results.json; then
            echo "❌ Dashboard read test FAILED thresholds"
            exit 1
          fi
          
          echo "✅ All load tests PASSED thresholds"
```

---

## Metrics and Monitoring

### Key Metrics to Track

1. **Response Time Percentiles**
   - P50 (median)
   - P95 (95th percentile)
   - P99 (99th percentile)
   - P99.9 (99.9th percentile)

2. **Error Rates**
   - HTTP 4xx errors
   - HTTP 5xx errors
   - Timeout errors

3. **Database Performance**
   - Active connections
   - Connection pool utilization
   - Query duration (P95, P99)
   - Slow query count

4. **Application Performance**
   - CPU utilization
   - Memory usage
   - Garbage collection frequency
   - Event loop lag (Node.js)

5. **Business Metrics**
   - Claims submitted per second
   - Votes submitted per second
   - Authentication success rate

---

### Monitoring Stack

**Real-Time Monitoring:**
- **k6 Output:** Live terminal output
- **Grafana Dashboard:** Import k6 dashboard template
- **Sentry:** Error tracking and alerting

**Database Monitoring:**
```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Slow queries (> 1 second)
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY total_time DESC 
LIMIT 10;

-- Connection pool stats
SELECT * FROM pg_stat_database WHERE datname = 'unioneyes_staging';
```

**Application Monitoring:**
```bash
# View Sentry errors during load test
# Filter by time range: Last 1 hour
# Group by: Error type

# Check CPU/memory in Docker
docker stats unioneyes-app

# Check Node.js event loop lag
# (Instrumented in application via prom-client)
curl http://staging.unioneyes.app/metrics | grep nodejs_eventloop_lag
```

---

## Acceptance Criteria

### Production Readiness Gates

Before deploying to production, all load tests must meet:

1. **Response Time:**
   - P95 < defined thresholds (per scenario)
   - P99 < defined thresholds (per scenario)
   - No requests > 10 seconds

2. **Error Rate:**
   - Overall error rate < 0.1%
   - No 5xx errors from application (only infra/network)

3. **Database:**
   - Connection pool < 80% utilization
   - No connection pool exhaustion
   - No deadlocks

4. **RLS Integrity:**
   - 0 RLS violations logged
   - 0 cross-tenant data leaks

5. **FSM Integrity:**
   - 0 invalid state transitions
   - 0 duplicate votes
   - 0 claim status corruption

---

## Troubleshooting

### Issue: High P99 Latency

**Symptoms:**
- P50 and P95 are acceptable
- P99 exceeds thresholds

**Diagnosis:**
```bash
# Check for slow queries
psql $DATABASE_URL -c "SELECT query, calls, mean_time FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC LIMIT 10;"

# Check for GC pauses
grep "GC pause" staging-logs/*.log
```

**Solutions:**
- Optimize slow queries (add indexes)
- Increase database connection pool
- Add read replicas for read-heavy queries
- Tune Node.js heap size

---

### Issue: Spike Test Failures

**Symptoms:**
- Tests pass during ramp-up
- Fail during spike (2x traffic)

**Diagnosis:**
```bash
# Check for connection pool exhaustion
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# Check for rate limiting
grep "429" load-test-results.json
```

**Solutions:**
- Increase connection pool max size
- Add connection pool queueing
- Implement request queueing (SQS/Bull)
- Scale horizontally (more app instances)

---

### Issue: RLS Violation During Load Test

**Symptoms:**
- Tests pass functionally
- Sentry shows RLS violation errors

**Diagnosis:**
```bash
# Check Sentry errors
# Filter: "RLS violation" or "row-level security"

# Check application logs
grep "withRLSContext" staging-logs/*.log
```

**Solutions:**
- Fix RLS violation (wrap query in withRLSContext)
- Verify organizationId propagation
- Add RLS scanner test to CI

---

## Load Test Schedule

### Pre-Production (Staging)

- **Weekly:** Dashboard read test (30 minutes)
- **Bi-weekly:** Claims submission test (15 minutes)
- **Monthly:** Full suite (all scenarios, 2 hours)

### Pre-Release (Production-Like)

- **Before every release:** Full suite on staging
- **After schema migration:** Full suite + soak test (24 hours)

### Production (Synthetic Load)

- **Hourly:** Health check (100 VUs, 5 minutes)
- **Daily:** Claims submission test (100 VUs, 10 minutes)

---

## Reporting

### Load Test Report Template

**File:** `load-tests/reports/LOAD_TEST_REPORT_YYYY-MM-DD.md`

```markdown
# Load Test Report

**Date:** 2026-02-09  
**Environment:** Staging  
**Commit:** bcf0aee8  
**Tester:** Platform Engineering Team

---

## Test Summary

| Scenario | Duration | VUs | Requests | Error Rate | P95 | P99 | Status |
|----------|----------|-----|----------|------------|-----|-----|--------|
| Claims Submission | 9m | 500 | 135,000 | 0.02% | 420ms | 1,800ms | ✅ PASS |
| Dashboard Read | 16m | 2,000 | 960,000 | 0.001% | 280ms | 950ms | ✅ PASS |
| Voting Spike | 10m | 5,000 | 250,000 | 0.4% | 950ms | 2,800ms | ✅ PASS |

---

## Detailed Results

### Claims Submission

- **Peak Throughput:** 250 claims/second
- **Database Connections:** Peak 120 (60% utilization)
- **Application CPU:** Peak 75%
- **Findings:** None

### Dashboard Read

- **Peak Throughput:** 1,000 requests/second
- **Database Connections:** Peak 80 (40% utilization)
- **Application CPU:** Peak 50%
- **Findings:** None

### Voting Spike

- **Peak Throughput:** 416 votes/second
- **Database Connections:** Peak 150 (75% utilization)
- **Application CPU:** Peak 85%
- **Findings:** 
  - P99 latency slightly elevated during spike (2,800ms vs 3,000ms threshold)
  - Consider adding read replica for election results queries

---

## Recommendations

1. ✅ **APPROVED FOR PRODUCTION** (all thresholds met)
2. **Optional:** Add read replica for voting sessions (proactive scaling)
3. **Monitor:** P99 latency in production during high-traffic events

---

**Approved By:** Senior Platform Engineer  
**Date:** 2026-02-09
```

---

**Document Owner:** Platform Engineering Team  
**Review Frequency:** Monthly  
**Last Review:** February 9, 2026
