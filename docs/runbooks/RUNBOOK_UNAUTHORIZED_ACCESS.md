# Runbook: Unauthorized Access Detected

**Severity:** High
**Estimated Time:** 30-90 minutes
**Requires:** Admin access, audit logs

## Symptoms
- Unauthorized access alert
- Access to restricted data by unexpected role

## Diagnosis
1. Identify the user, role, and resource accessed.
2. Review audit logs for related actions.
3. Check recent role changes and permission grants.

## Resolution Steps
1. Disable the account or revoke sessions.
2. Revert suspicious role or permission changes.
3. Rotate any exposed credentials.
4. Document the event and impacted resources.

## Verification
- [ ] No further unauthorized access events
- [ ] Roles and permissions match expected state

## Post-Incident
- [ ] Update detection rules if needed
- [ ] Notify tenant administrators if applicable

## Escalation
If access includes sensitive data, escalate to security lead immediately.
