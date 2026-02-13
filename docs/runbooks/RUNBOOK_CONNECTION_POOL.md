# Runbook: Connection Pool Exhaustion

**Severity:** High
**Estimated Time:** 20-60 minutes
**Requires:** Database admin access

## Symptoms
- Connection pool exhaustion alert
- Requests blocked waiting for connections

## Diagnosis
1. Check active connections and pool usage.
2. Identify long-running or idle connections.
3. Review recent traffic patterns.

## Resolution Steps
1. Terminate runaway connections if safe.
2. Increase pool size temporarily if possible.
3. Reduce connection usage in hotspots.

## Verification
- [ ] Pool usage returns below threshold
- [ ] Request latency normalizes

## Post-Incident
- [ ] Update connection pool sizing
- [ ] Add alerting for early warning

## Escalation
If pool remains exhausted, escalate to database owner.
