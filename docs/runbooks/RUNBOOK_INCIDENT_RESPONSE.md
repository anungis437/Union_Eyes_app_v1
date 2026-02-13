# Runbook: Incident Response

**Severity:** Critical
**Estimated Time:** 30-60 minutes
**Requires:** Admin access, audit log viewer, alert dashboard

## Symptoms
- Active critical alert firing
- User reports of outage or data issues
- Monitoring shows error spikes or downtime

## Diagnosis
1. Check the alert details and timeline.
2. Review recent deploys, config changes, and feature flags.
3. Inspect audit logs for recent high-risk events.
4. Validate service health and database connectivity.

## Resolution Steps
1. Declare incident and assign an incident lead.
2. Contain impact (disable features, rate limit, or rollback if needed).
3. Mitigate root cause using the relevant runbook.
4. Communicate status to stakeholders at regular intervals.

## Verification
- [ ] Error rate returns to baseline
- [ ] Alerts clear or are acknowledged with a plan
- [ ] Service health checks pass

## Post-Incident
- [ ] Write incident summary and timeline
- [ ] Create follow-up tasks for remediation
- [ ] Update alert thresholds if needed

## Escalation
If not mitigated within 30 minutes, escalate to on-call lead and security.
