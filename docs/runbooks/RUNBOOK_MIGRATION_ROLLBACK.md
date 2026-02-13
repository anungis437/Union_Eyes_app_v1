# Runbook: Migration Rollback

**Severity:** High
**Estimated Time:** 30-90 minutes
**Requires:** Database admin access

## Symptoms
- Migration causes errors or data inconsistency
- Application failures after schema changes

## Diagnosis
1. Identify the migration version and changes.
2. Review migration logs and error messages.

## Resolution Steps
1. Execute rollback script for the migration.
2. Verify schema compatibility with application.
3. Re-run data integrity checks.

## Verification
- [ ] Application operates without migration errors
- [ ] Data checks pass

## Post-Incident
- [ ] Document migration issue and fix
- [ ] Update migration testing procedures

## Escalation
If rollback fails, escalate to database owner and engineering lead.
