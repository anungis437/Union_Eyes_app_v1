# Runbook: Performance Degradation

**Severity:** High
**Estimated Time:** 30-120 minutes
**Requires:** Admin access, database monitoring

## Symptoms
- Slow API responses
- Slow query alerts
- Increased timeouts

## Diagnosis
1. Identify slow endpoints and queries.
2. Check database load and connection pool.
3. Review recent deploys and config changes.

## Resolution Steps
1. Enable query logging for affected endpoints.
2. Scale resources or adjust connection pool.
3. Roll back recent changes if needed.

## Verification
- [ ] Response times return to baseline
- [ ] Slow query alerts clear

## Post-Incident
- [ ] Add performance regression test
- [ ] Update indexes or caching strategy

## Escalation
If performance does not recover, escalate to infrastructure lead.
