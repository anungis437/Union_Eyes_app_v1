# Runbook: Service Disruption or DoS

**Severity:** High
**Estimated Time:** 30-120 minutes
**Requires:** Admin access, monitoring dashboards

## Symptoms
- Sudden traffic spikes
- Elevated error rates or timeouts
- Health check failures

## Diagnosis
1. Check request volume and top endpoints.
2. Identify suspicious IPs or user agents.
3. Verify database and cache performance.

## Resolution Steps
1. Apply rate limiting and traffic shaping.
2. Block abusive IPs at the edge or WAF.
3. Scale resources as needed.
4. Communicate impact to stakeholders.

## Verification
- [ ] Error rate stabilizes
- [ ] Health checks pass
- [ ] Latency returns to baseline

## Post-Incident
- [ ] Review logs for attack signatures
- [ ] Update WAF rules and rate limits

## Escalation
If service remains unstable after 60 minutes, escalate to infrastructure lead.
