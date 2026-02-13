# Runbook: Suspected Data Breach

**Severity:** Critical
**Estimated Time:** Immediate response, 1-4 hours initial triage
**Requires:** Security lead, audit logs, admin access

## Symptoms
- Data export volume spike
- Unauthorized access alerts
- Off-hours admin activity

## Diagnosis
1. Identify affected tenants, users, and data scope.
2. Review audit logs for export or access events.
3. Validate whether data left the system.

## Resolution Steps
1. Contain: disable affected accounts and revoke sessions.
2. Preserve evidence: export audit logs and system snapshots.
3. Rotate secrets and API keys if needed.
4. Engage legal and compliance teams.

## Verification
- [ ] No further suspicious access events
- [ ] Alerts resolved or silenced with justification
- [ ] Evidence preserved for investigation

## Post-Incident
- [ ] Complete breach report and timeline
- [ ] Notify stakeholders per policy
- [ ] Create remediation plan

## Escalation
If scope is unclear after 60 minutes, escalate to security leadership.
