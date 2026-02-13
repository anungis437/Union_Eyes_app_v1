# Runbook: Legal Hold Activation

**Severity:** High
**Estimated Time:** 30-60 minutes
**Requires:** Admin access, legal approval

## Symptoms
- Legal hold request received
- Active litigation or investigation

## Diagnosis
1. Confirm legal hold scope and duration.
2. Identify affected data classes and tenants.

## Resolution Steps
1. Enable legal hold for specified data.
2. Suspend automated deletion or retention policies.
3. Record legal hold metadata and owner.

## Verification
- [ ] Retention policies overridden for scope
- [ ] Audit log records legal hold activation

## Post-Incident
- [ ] Schedule legal hold review
- [ ] Notify relevant stakeholders

## Escalation
If scope is unclear, escalate to legal counsel.
